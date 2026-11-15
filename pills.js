(() => {
  const stage = document.querySelector('.pill-stage');
  if (!stage) return;
  const pills = [...stage.querySelectorAll('.skill-pill')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const step = 1000 / 60;
  let physics, engine, bodies, loading;
  let visible = false;
  let completed = false;
  let started = false;
  let frame = 0;
  let previousTime = 0;
  let accumulator = 0;
  let elapsed = 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function fallback() {
    stop();
    completed = true;
    stage.removeAttribute('data-physics');
    pills.forEach(pill => pill.removeAttribute('style'));
    if (engine) {
      physics.Composite.clear(engine.world, false);
      physics.Engine.clear(engine);
    }
  }

  function warmPhysics() {
    if (reducedMotion.matches || completed) return Promise.resolve();
    if (loading) return loading;
    loading = Promise.all([
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/matter-0.20.0.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      }),
      document.fonts.load('400 18px "Suisse Intl"'),
    ]).then(() => {
      if (reducedMotion.matches || completed) return;
      physics = window.Matter;
      engine = physics.Engine.create({ enableSleeping: true });
      // A fixed logical stage scales as a whole in CSS, so resizing never
      // restarts the fall or changes the collision geometry.
      physics.Composite.add(engine.world, [
        physics.Bodies.rectangle(212, 414, 524, 40, { isStatic: true }),
        physics.Bodies.rectangle(-25, 152, 50, 604, { isStatic: true }),
        physics.Bodies.rectangle(449, 152, 50, 604, { isStatic: true }),
      ]);
      const starts = [
        { x: 304, angle: 0.23, delay: 280 },
        { x: 182, angle: -0.21, delay: 350 },
        { x: 212, angle: 0.04, delay: 70 },
        { x: 354, angle: -0.14, delay: 0 },
        { x: 81, angle: 0.13, delay: 140 },
      ];
      bodies = pills.map((pill, index) => {
        const { x, angle, delay } = starts[index];
        const width = pill.offsetWidth;
        const height = pill.offsetHeight;
        const body = physics.Bodies.rectangle(x, -60, width, height, {
          chamfer: { radius: height / 2, quality: 16 },
          angle, restitution: 0.2, friction: 0.65,
          frictionStatic: 1, frictionAir: 0.012, sleepThreshold: 45,
        });
        // Keep the labels readable while still allowing collision-driven rotation.
        physics.Body.setInertia(body, body.inertia * 4);
        pill.style.left = '0';
        pill.style.top = '0';
        pill.style.visibility = 'hidden';
        return { pill, body, width, height, delay, added: false };
      });
      resume();
    }).catch(fallback);
    return loading;
  }

  function render() {
    for (const { pill, body, width, height, added } of bodies) {
      if (!added) continue;
      pill.style.transform = `translate3d(${body.position.x - width / 2}px, ${body.position.y - height / 2}px, 0) rotate(${body.angle}rad)`;
    }
  }

  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || completed) return;
    accumulator += previousTime ? Math.min(time - previousTime, 50) : step;
    previousTime = time;
    while (accumulator >= step) {
      elapsed += step;
      for (const item of bodies) {
        if (!item.added && elapsed >= item.delay) {
          physics.Composite.add(engine.world, item.body);
          item.added = true;
          item.pill.style.visibility = 'visible';
        }
      }
      physics.Engine.update(engine, step);
      accumulator -= step;
    }
    render();
    if (bodies.every(item => item.added && item.body.isSleeping)) {
      completed = true;
      stage.dataset.physics = 'settled';
      physics.Engine.clear(engine);
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    if (!engine || !visible || document.hidden || completed || frame || reducedMotion.matches) return;
    started = true;
    stage.dataset.physics = 'running';
    frame = requestAnimationFrame(tick);
  }

  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  stage.dataset.physics = 'waiting';
  const warmer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      warmPhysics();
      warmer.disconnect();
    }
  }, { rootMargin: '600px' });
  warmer.observe(stage);
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    const enoughVisible = entry.intersectionRect.height >= Math.min(entry.boundingClientRect.height * 0.9, innerHeight * 0.6);
    visible = entry.isIntersecting && (started || enoughVisible);
    if (visible) warmPhysics().then(resume);
    else stop();
  }, { threshold: [0, 0.25, 0.5, 0.75, 0.9] });
  observer.observe(stage);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : resume());
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', resume);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      warmer.disconnect();
      observer.disconnect();
      fallback();
    }
  });
})();
