(() => {
  const items = [...document.querySelectorAll('.faq-item')];
  if (!items.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Keep native details/summary semantics and the no-JavaScript fallback.
  // Manage exclusivity here so the previous answer can animate closed.
  const states = items.map(item => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.faq-answer');
    const panel = document.createElement('div');
    panel.className = 'faq-panel';
    answer.before(panel);
    panel.append(answer);
    item.removeAttribute('name');
    const state = { item, summary, answer, panel, expanded: item.open, animating: false, timer: 0 };
    item.dataset.expanded = String(state.expanded);
    summary.setAttribute('aria-expanded', String(state.expanded));
    panel.inert = !state.expanded;
    return state;
  });

  function finish(state) {
    clearTimeout(state.timer);
    state.animating = false;
    state.item.open = state.expanded;
    // Return to natural height so text reflows normally after resizing.
    state.panel.style.height = '';
  }

  function setExpanded(state, expanded, instant = false) {
    if (state.expanded === expanded) return;
    clearTimeout(state.timer);
    const currentHeight = state.item.open ? state.panel.getBoundingClientRect().height : 0;
    state.expanded = expanded;
    state.item.classList.toggle('faq-instant', instant);
    // Keep the disclosure open until the collapse transition finishes.
    state.item.open = true;
    state.panel.style.height = `${currentHeight}px`;
    state.panel.getBoundingClientRect();
    state.item.dataset.expanded = String(expanded);
    state.summary.setAttribute('aria-expanded', String(expanded));
    state.panel.inert = !expanded;
    state.panel.style.height = `${expanded ? state.answer.getBoundingClientRect().height : 0}px`;
    state.animating = !instant;
    if (instant) {
      finish(state);
      // Commit instant keyboard/reduced-motion changes before restoring transitions.
      state.panel.getBoundingClientRect();
      state.item.classList.remove('faq-instant');
    } else {
      // Covers canceled transitions and browsers that don't emit transitionend.
      state.timer = setTimeout(() => finish(state), 240);
    }
  }

  states.forEach(state => {
    state.summary.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0) return;
      event.preventDefault();
      const expanded = !state.expanded;
      const instant = reducedMotion.matches || event.detail === 0;
      if (expanded) states.forEach(other => {
        if (other !== state) setExpanded(other, false, instant);
      });
      setExpanded(state, expanded, instant);
    });
    state.panel.addEventListener('transitionend', event => {
      if (event.target === state.panel && event.propertyName === 'height' && state.animating) finish(state);
    });
  });

  const settle = () => states.forEach(state => {
    if (state.animating) finish(state);
  });
  window.addEventListener('resize', settle);
  reducedMotion.addEventListener('change', settle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) settle();
  });
})();
