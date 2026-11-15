(() => {
  const home = document.querySelector('body > main');
  const preview = document.querySelector('a.work');
  const floating = document.querySelector('.floating-work');
  if (!home || !preview) return;

  const homeUrl = location.href;
  const homeTitle = document.title;
  let overlay;
  let loading;
  let opening = false;
  let origin;
  let trigger;
  let pointerOrigin;
  let lastGalleryScroll = 0;
  const plainClick = event => !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

  async function prepare() {
    if (overlay) return overlay;
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch('/work');
      if (!response.ok) throw new Error('Gallery could not load');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      const gallery = page.querySelector('.work-page');
      const close = page.querySelector('.work-close');
      if (!gallery || !close) throw new Error('Gallery content is missing');

      const panel = document.createElement('div');
      panel.className = 'work-overlay';
      panel.tabIndex = -1;
      panel.hidden = true;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Selected work');
      panel.append(document.importNode(gallery, true), document.importNode(close, true));
      panel.querySelector('.work-close').addEventListener('click', event => {
        if (!plainClick(event)) return;
        event.preventDefault();
        history.back();
      });
      panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          history.back();
        }
        // The gallery currently has one focusable control; keep focus in the dialog.
        if (event.key === 'Tab') {
          event.preventDefault();
          panel.querySelector('.work-close').focus({ preventScroll: true });
        }
      });
      document.body.append(panel);
      overlay = panel;
      return panel;
    })();
    try { return await loading; }
    finally { loading = null; }
  }

  function show() {
    home.inert = true;
    home.setAttribute('aria-hidden', 'true');
    if (floating) floating.inert = true;
    document.documentElement.classList.add('has-work-overlay');
    overlay.hidden = false;
    overlay.scrollTop = lastGalleryScroll;
    document.title = 'Selected work — Graaf';
    overlay.focus({ preventScroll: true });
  }

  function hide() {
    if (!overlay || overlay.hidden) return;
    lastGalleryScroll = overlay.scrollTop;
    overlay.hidden = true;
    document.title = homeTitle;
    document.documentElement.classList.remove('has-work-overlay');
    home.inert = false;
    home.removeAttribute('aria-hidden');
    if (floating) floating.inert = !floating.classList.contains('is-visible');
    // The homepage never unmounts or changes its scroll container. No delayed
    // font/layout restoration, two-frame correction, or incoming snapshot is needed.
    if (origin && (scrollX !== origin.x || scrollY !== origin.y)) {
      scrollTo({ left: origin.x, top: origin.y, behavior: 'instant' });
    }
    trigger?.focus({ preventScroll: true });
  }

  document.addEventListener('pointerdown', event => {
    const link = event.target.closest('a.work, a.floating-work');
    pointerOrigin = plainClick(event) && link ? { link, x: scrollX, y: scrollY } : null;
  }, { capture: true, passive: true });
  document.addEventListener('pointercancel', () => { pointerOrigin = null; });
  document.addEventListener('click', async event => {
    const link = event.target.closest('a.work, a.floating-work');
    if (!plainClick(event) || !link) return;
    event.preventDefault();
    if (opening || (overlay && !overlay.hidden)) return;
    opening = true;
    trigger = link;
    const position = event.detail > 0 && pointerOrigin?.link === link
      ? pointerOrigin : { x: scrollX, y: scrollY };
    pointerOrigin = null;
    origin = {
      url: homeUrl, x: position.x, y: position.y,
      faqOpen: [...document.querySelectorAll('.faq-item')].map(item => item.dataset.expanded === 'true'),
    };
    try {
      await prepare();
      history.replaceState({ ...history.state, graafHomeScroll: origin }, '');
      history.scrollRestoration = 'manual';
      history.pushState({ graafWorkOrigin: origin, graafOverlay: true }, '', '/work');
      lastGalleryScroll = 0;
      show();
    } catch {
      // Keep ordinary /work navigation available if fetching the dialog fails.
      try { sessionStorage.setItem('graaf:work-origin', JSON.stringify(origin)); } catch {}
      history.replaceState({ ...history.state, graafHomeScroll: origin }, '');
      location.assign(link.href);
    } finally {
      opening = false;
    }
  }, { capture: true });

  window.addEventListener('popstate', event => {
    if (event.state?.graafOverlay && overlay) {
      origin = event.state.graafWorkOrigin;
      show();
    } else hide();
  });

  // Warm only on intent; reuse the existing prefetched gallery and image cache.
  const warm = () => { prepare().catch(() => {}); };
  [preview, floating].filter(Boolean).forEach(link => {
    link.addEventListener('pointerenter', warm, { once: true });
    link.addEventListener('focus', warm, { once: true });
    link.addEventListener('touchstart', warm, { once: true, passive: true });
  });
})();
