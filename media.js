// Keyboard navigation stays immediate; pointer navigation uses the CSS crossfade.
let keyboardNavigation = false;
document.addEventListener('click', event => {
  if (event.target.closest('a[href]')) keyboardNavigation = event.detail === 0;
});
window.addEventListener('pageswap', event => {
  if (keyboardNavigation) event.viewTransition?.skipTransition();
});
window.addEventListener('pageshow', () => { keyboardNavigation = false; });

// Treat the gallery as a detour from the current home-page position.
(() => {
  const pendingKey = 'graaf:work-origin';
  const restoreKey = 'graaf:restore-home';
  const read = key => {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  };
  const write = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Navigation still works without storage. */ }
  };
  const remove = key => {
    try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
  };
  const plainClick = event => !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  if (document.querySelector('a.work')) {
    let restoration = null;
    let restorationFrame = 0;
    let pointerOrigin = null;
    const validPosition = position => position?.url === location.href && Number.isFinite(position.x) && Number.isFinite(position.y);
    const applyPosition = () => {
      if (!restoration) return;
      scrollTo({ left: restoration.x, top: restoration.y, behavior: 'instant' });
    };
    const finishRestoration = () => {
      cancelAnimationFrame(restorationFrame);
      restoration = null;
      remove(restoreKey);
      const { graafHomeScroll, ...state } = history.state || {};
      history.replaceState(state, '');
      document.documentElement.classList.remove('is-restoring-scroll');
      history.scrollRestoration = 'auto';
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => window.removeEventListener(type, finishRestoration, true));
    };
    const beginRestoration = () => {
      if (restoration) { applyPosition(); return; }
      const position = read(restoreKey) || history.state?.graafHomeScroll;
      if (!validPosition(position)) return;
      restoration = position;
      // A reloaded gallery can return to a fresh document. Restore its FAQ
      // layout before measuring scroll, just as the mounted overlay preserves it.
      if (Array.isArray(position.faqOpen)) {
        const items = [...document.querySelectorAll('.faq-item')];
        items.forEach(item => { item.open = false; });
        items.forEach((item, index) => { item.open = position.faqOpen[index] === true; });
      }
      history.scrollRestoration = 'manual';
      document.documentElement.classList.add('is-restoring-scroll');
      // A real user gesture cancels late corrections instead of fighting their scroll.
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(type => window.addEventListener(type, finishRestoration, { capture: true, passive: true }));
      applyPosition();
    };
    document.addEventListener('pointerdown', event => {
      const link = event.target.closest('a.work, a.floating-work');
      // Capture before the browser focuses the link and potentially scrolls it.
      pointerOrigin = plainClick(event) && link
        ? { link, position: { url: location.href, x: scrollX, y: scrollY } }
        : null;
    }, { capture: true, passive: true });
    document.addEventListener('pointercancel', () => { pointerOrigin = null; });
    document.addEventListener('click', event => {
      const link = event.target.closest('a.work, a.floating-work');
      if (!plainClick(event) || !link) return;
      const position = event.detail > 0 && pointerOrigin?.link === link
        ? pointerOrigin.position
        : { url: location.href, x: scrollX, y: scrollY };
      pointerOrigin = null;
      write(pendingKey, position);
      history.replaceState({ ...history.state, graafHomeScroll: position }, '');
      // This belongs to the home history entry, before the gallery is opened.
      // It prevents native focus/scroll restoration from overriding our coordinates.
      history.scrollRestoration = 'manual';
    });
    // Restore before a return transition captures the incoming page, including BFCache.
    window.addEventListener('pagereveal', beginRestoration);
    window.addEventListener('pageshow', () => {
      beginRestoration();
      if (!restoration) return;
      const position = restoration;
      // Fonts can change document height on a fresh load. Wait for that layout,
      // then apply the exact coordinates after history traversal has finished.
      document.fonts.ready.then(() => {
        if (restoration !== position) return;
        restorationFrame = requestAnimationFrame(() => {
          if (restoration !== position) return;
          applyPosition();
          restorationFrame = requestAnimationFrame(() => {
            if (restoration !== position) return;
            applyPosition();
            finishRestoration();
          });
        });
      });
    });
    beginRestoration();
    return;
  }

  const closeWork = document.querySelector('.work-page ~ .work-close');
  if (!closeWork) return;
  // Keep the gallery's own history behavior independent of the home entry.
  history.scrollRestoration = 'auto';
  const pending = read(pendingKey);
  remove(pendingKey);
  // Store the origin on this history entry, preserving it through a reload.
  if (pending?.url === document.referrer) {
    history.replaceState({ ...history.state, graafWorkOrigin: pending }, '');
  }
  const reloadedOrigin = history.state?.graafWorkOrigin;
  window.addEventListener('popstate', () => {
    // A reload of a pushState gallery can leave its HTML attached to the
    // previous same-document entry. Load home if traversal only changed the URL.
    if (reloadedOrigin && location.href === reloadedOrigin.url) {
      write(restoreKey, reloadedOrigin);
      location.replace(reloadedOrigin.url);
    }
  });
  closeWork.addEventListener('click', event => {
    if (!plainClick(event)) return;
    const origin = history.state?.graafWorkOrigin;
    if (!origin) return; // Direct visits retain the normal home link.
    write(restoreKey, origin);
    if (history.length > 1) {
      event.preventDefault();
      history.back();
    }
  });
})();

// Reserve each artwork's geometry and show a quiet wireframe until it decodes.
document.querySelectorAll('.card-surface, .gallery-panel, .character-panel').forEach(panel => {
  const image = [...panel.querySelectorAll('img')].at(-1);
  if (!image) return;
  const reveal = () => panel.classList.remove('is-loading');
  const decoded = () => image.decode().catch(() => {}).then(reveal);
  if (image.complete && image.naturalWidth) return;
  panel.classList.add('is-loading');
  image.addEventListener('load', decoded, { once: true });
  image.addEventListener('error', reveal, { once: true });
  // Catch cached images completing between the initial check and listeners.
  if (image.complete) image.naturalWidth ? decoded() : reveal();
});

const workLink = document.querySelector('a.work');
if (workLink) {
  const floatingWork = document.querySelector('.floating-work');
  if (floatingWork) {
    let visibilityFrame = 0;
    let isVisible;
    const updateVisibility = () => {
      visibilityFrame = 0;
      const nextVisible = workLink.getBoundingClientRect().bottom <= 0;
      if (isVisible === nextVisible) return;
      isVisible = nextVisible;
      floatingWork.inert = !isVisible;
      floatingWork.setAttribute('aria-hidden', String(!isVisible));
      floatingWork.classList.toggle('is-visible', isVisible);
      // Keep the element mounted so reversing scroll retargets the transition.
      floatingWork.hidden = false;
    };
    const scheduleVisibility = () => {
      if (!visibilityFrame) visibilityFrame = requestAnimationFrame(updateVisibility);
    };
    // Check the actual boundary so jumping past the preview also works.
    window.addEventListener('scroll', scheduleVisibility, { passive: true });
    window.addEventListener('resize', scheduleVisibility);
    window.addEventListener('pageshow', scheduleVisibility);
    window.addEventListener('load', scheduleVisibility, { once: true });
    updateVisibility();
  }
  const connection = navigator.connection;
  const conserveData = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
  const warmed = [];
  let warming = false;

  function warmWork() {
    if (warming || conserveData) return;
    warming = true;
    const page = document.createElement('link');
    page.rel = 'prefetch';
    page.href = '/work';
    page.as = 'document';
    document.head.append(page);

    // Match the gallery's sizes/srcset so navigation reuses the same cached file.
    workLink.querySelectorAll('[data-work-srcset]').forEach(thumbnail => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.sizes = '(max-width: 1213px) calc(100vw - 40px), 1173px';
      image.srcset = thumbnail.dataset.workSrcset;
      image.src = thumbnail.src;
      warmed.push(image);
      image.decode().catch(() => {});
    });
  }

  workLink.addEventListener('pointerenter', warmWork, { once: true });
  workLink.addEventListener('focusin', warmWork, { once: true });
  workLink.addEventListener('touchstart', warmWork, { once: true, passive: true });
  floatingWork?.addEventListener('pointerenter', warmWork, { once: true });
  floatingWork?.addEventListener('focusin', warmWork, { once: true });
  floatingWork?.addEventListener('touchstart', warmWork, { once: true, passive: true });
  // The visible page gets the network first; warm the gallery during idle time.
  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(warmWork, { timeout: 2500 });
    else setTimeout(warmWork, 1000);
  }, { once: true });
}
