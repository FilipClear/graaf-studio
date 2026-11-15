(() => {
  const section = document.querySelector('.studio-achievements');
  if (!section) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const counters = [...section.querySelectorAll('.stat-count')];
  const laurels = [...section.querySelectorAll('.stat-laurel')];
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
  const [x1, y1, x2, y2] = ease.match(/[\d.]+/g).map(Number);
  const animations = [];
  let frame = 0;
  let started = false;
  let completed = false;

  // Evaluate the shared CSS curve for the count-up as well as the laurels.
  function easedProgress(progress) {
    const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 12; i++) {
      const t = (low + high) / 2;
      if (bezier(t, x1, x2) < progress) low = t;
      else high = t;
    }
    return bezier((low + high) / 2, y1, y2);
  }

  function render(progress) {
    counters.forEach(counter => {
      const value = Math.round(Number(counter.dataset.count) * progress);
      counter.textContent = `${counter.dataset.prefix || ''}${value}${counter.dataset.suffix || ''}`;
    });
  }

  function finish() {
    completed = true;
    cancelAnimationFrame(frame);
    animations.forEach(animation => animation.cancel());
    render(1);
    section.dataset.motion = 'complete';
    observer.disconnect();
  }

  async function reveal() {
    if (started || completed) return;
    started = true;
    await Promise.all([
      document.fonts.load('500 48px "Suisse Intl"'),
      ...laurels.map(laurel => laurel.querySelector('img').decode().catch(() => {})),
    ]);
    if (completed) return;
    section.dataset.motion = 'running';
    laurels.forEach((laurel, index) => {
      const angle = index % 2 ? -18 : 18;
      animations.push(laurel.animate([
        { opacity: 0, transform: `translateY(12px) rotate(${angle}deg)` },
        { opacity: 1, transform: 'translateY(0) rotate(0deg)' },
      ], { duration: 650, delay: Math.floor(index / 2) * 70, easing: ease, fill: 'both' }));
    });
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / 1000, 1);
      render(easedProgress(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
  }

  section.dataset.motion = 'waiting';
  render(0);
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) reveal().catch(finish);
    else if (!entry.isIntersecting && started) finish();
  }, { threshold: [0, 0.6] });
  observer.observe(section);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finish();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && started) finish();
  });
})();
