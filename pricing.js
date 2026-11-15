(() => {
  const content = document.querySelector('.pricing-content');
  if (!content) return;

  const countdown = content.querySelector('.pricing-countdown');
  const clock = content.querySelector('.pricing-clock');
  let countdownTimer;
  function updateCountdown() {
    clearTimeout(countdownTimer);
    const now = new Date();
    // Construct the next local midnight, including daylight-saving changes.
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const remaining = Math.max(0, Math.ceil((midnight - now) / 1000));
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor(remaining % 3600 / 60);
    const seconds = remaining % 60;
    clock.textContent = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
    clock.dateTime = `PT${hours}H${minutes}M${seconds}S`;
    // Derive from the clock each tick, so background tabs cannot cause drift.
    if (!document.hidden) countdownTimer = setTimeout(updateCountdown, 1000 - now.getMilliseconds());
  }
  updateCountdown();
  countdown.hidden = false;
  content.querySelector('.pricing-saving').hidden = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(countdownTimer);
    else updateCountdown();
  });
  window.addEventListener('pageshow', updateCountdown);
  window.addEventListener('pagehide', () => clearTimeout(countdownTimer));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const strike = content.querySelector('.price-strike > span');
  const price = content.querySelector('.price-new');
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
  const animations = [];
  let started = false;
  let completed = false;

  function finish() {
    completed = true;
    content.dataset.motion = 'complete';
    animations.forEach(animation => animation.cancel());
    observer.disconnect();
  }

  async function reveal() {
    if (started || completed) return;
    started = true;
    await document.fonts.load('500 48px "Suisse Intl"');
    if (completed) return;
    // Constant-speed ink reveal keeps the draw visible from left to right.
    // Then the larger, raised price lands and settles like a sticker.
    animations.push(strike.animate([
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)' },
    ], { duration: 460, delay: 180, easing: 'linear', fill: 'both' }));
    animations.push(price.animate([
      { transform: 'translateY(-48px) scale(1.55) rotate(-13deg)', offset: 0 },
      { transform: 'translateY(2px) scale(0.985) rotate(-4deg)', offset: .78 },
      { transform: 'translateY(0) scale(1) rotate(-4.76deg)', offset: 1 },
    ], { duration: 480, delay: 720, easing: ease, fill: 'both' }));
    animations.push(price.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 120, delay: 720, easing: 'linear', fill: 'both' }));
    content.dataset.motion = 'running';
    await Promise.all(animations.map(animation => animation.finished));
    finish();
  }

  content.dataset.motion = 'waiting';
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (entry.isIntersecting && entry.intersectionRatio >= .65) reveal().catch(finish);
    else if (!entry.isIntersecting && started) finish();
  }, { threshold: [0, .65] });
  observer.observe(content);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finish();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && started) finish();
  });
})();
