(() => {
  const signatures = [...document.querySelectorAll('.signature')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!signatures.length || reduceMotion.matches || !window.IntersectionObserver || !Element.prototype.animate) return;

  const running = new Map();
  const finish = signature => {
    signature.dataset.motion = 'complete';
    running.get(signature)?.forEach(animation => animation.cancel());
    running.delete(signature);
    observer.unobserve(signature.closest('.testimonial-card'));
  };

  const draw = signature => {
    if (signature.dataset.motion !== 'waiting') return;
    signature.dataset.motion = 'drawing';
    const strokes = [...signature.querySelectorAll('.signature-pen')];
    const totalLength = strokes.reduce((sum, stroke) => sum + Number(stroke.dataset.length), 0);
    // Constant pen speed along each outline, with brief pen lifts between letters.
    // A mask reveals the original filled glyph, so the final ink never thickens.
    const duration = signature.dataset.signature === 'christopher' ? 1250 : 1000;
    let delay = signature.dataset.signature === 'jimmy' ? 80 : 0;
    const animations = strokes.map(stroke => {
      const letterDuration = duration * Number(stroke.dataset.length) / totalLength;
      const animation = stroke.animate(
        [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
        { duration: letterDuration, delay, easing: 'linear', fill: 'both' }
      );
      delay += letterDuration + 12;
      return animation;
    });
    running.set(signature, animations);
    Promise.all(animations.map(animation => animation.finished)).then(() => finish(signature)).catch(() => {});
  };

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const signature = entry.target.querySelector('.signature');
      if (entry.isIntersecting && entry.intersectionRatio >= .55) draw(signature);
      else if (!entry.isIntersecting && running.has(signature)) finish(signature);
    }
  }, { threshold: [0, .55] });

  signatures.forEach(signature => {
    signature.dataset.motion = 'waiting';
    observer.observe(signature.closest('.testimonial-card'));
  });
  reduceMotion.addEventListener('change', event => {
    if (event.matches) signatures.forEach(finish);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...running.keys()].forEach(finish);
  });
})();
