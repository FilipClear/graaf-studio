const work = document.querySelector('.work');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const cards = [...document.querySelectorAll('.work-card')];
const reflections = cards.map(card => card.querySelector('.sheen'));
// The front card counter-rotates against the back cards, as in the reference.
const poses = [
  { rest: -7.39, turn: 9, x: -10, y: -12, z: 8, depth: 0.6 },
  // Keep the right card's upper corner tucked behind the front card.
  { rest: 4.13, turn: 1, x: 10, y: 3, z: 2, depth: 0.35 },
  { rest: -2.66, turn: -5, x: 0, y: -7, z: 16, depth: 1 },
];
// Hover, pointer X/Y, and an independent shimmer progress.
const springs = Array.from({ length: 4 }, () => ({ value: 0, velocity: 0, target: 0 }));
// Fast hover feedback with enough damping to avoid a lingering bounce.
const spring = { mass: 1, stiffness: 650, damping: 42 };
// Let the light glide across without slowing the cards or bouncing back.
const shimmerSpring = { mass: 1, stiffness: 100, damping: 20 };
let frame = 0;
let previousTime = 0;
let navigating = false;

function renderCards() {
  const [amount, pointerX, pointerY, shimmer] = springs.map(axis => axis.value);
  cards.forEach((card, index) => {
    const pose = poses[index];
    const x = pose.x * amount + pointerX * 7 * pose.depth;
    const y = pose.y * amount + pointerY * 4 * pose.depth;
    const rotation = pose.rest + pose.turn * amount + pointerX * 1.5 * pose.depth;
    card.style.transform = `translate3d(${x}px, ${y}px, ${pose.z * amount}px) rotateX(${-pointerY * 4 * pose.depth}deg) rotateY(${pointerX * 6 * pose.depth}deg) rotate(${rotation}deg)`;
    // Preserve the reflection's velocity when hover reverses mid-sweep.
    reflections[index].style.transform = `translateX(${-65 + shimmer * 125 + pointerX * 10 + index * 3 * shimmer}%)`;
    reflections[index].style.opacity = String(Math.min(1, Math.max(0, shimmer * 1.5)));
  });
}

function tick(time) {
  let remaining = Math.min((time - previousTime) / 1000, 0.032);
  previousTime = time;
  // Small integration steps give the same response on 60/120/144 Hz displays.
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 240);
    springs.forEach((axis, index) => {
      const settings = index === 3 ? shimmerSpring : spring;
      const force = settings.stiffness * (axis.target - axis.value) - settings.damping * axis.velocity;
      axis.velocity += (force / settings.mass) * dt;
      axis.value += axis.velocity * dt;
    });
    remaining -= dt;
  }
  const settled = springs.every(axis => Math.abs(axis.target - axis.value) < 0.001 && Math.abs(axis.velocity) < 0.001);
  if (settled) springs.forEach(axis => { axis.value = axis.target; axis.velocity = 0; });
  renderCards();
  frame = settled ? 0 : requestAnimationFrame(tick);
  if (settled && springs[0].target === 0) clearCardStyles();
}

function clearCardStyles() {
  cards.forEach(card => card.style.removeProperty('transform'));
  reflections.forEach(reflection => { reflection.style.removeProperty('transform'); reflection.style.removeProperty('opacity'); });
}

function animateTo(active, x = 0, y = 0) {
  if (reducedMotion.matches || navigating) return;
  [active ? 1 : 0, active ? x : 0, active ? y : 0, active ? 1 : 0].forEach((target, index) => { springs[index].target = target; });
  if (!frame) { previousTime = performance.now(); frame = requestAnimationFrame(tick); }
}

function trackPointer(event) {
  if (!finePointer.matches || event.pointerType === 'touch') return;
  const bounds = work.getBoundingClientRect();
  const clamp = value => Math.max(-1, Math.min(1, value));
  animateTo(true, clamp((event.clientX - bounds.left) / bounds.width * 2 - 1), clamp((event.clientY - bounds.top) / bounds.height * 2 - 1));
}

work.addEventListener('pointerenter', trackPointer);
work.addEventListener('pointermove', trackPointer);
work.addEventListener('pointerleave', () => animateTo(false));
work.addEventListener('pointercancel', () => animateTo(false));
work.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  // Hold the current pose through the outgoing snapshot; do not snap to rest.
  navigating = true;
  cancelAnimationFrame(frame);
  frame = 0;
});

function stopMotion() {
  if (navigating) return;
  cancelAnimationFrame(frame);
  frame = 0;
  springs.forEach(axis => { axis.value = axis.velocity = axis.target = 0; });
  clearCardStyles();
}
reducedMotion.addEventListener('change', stopMotion);
finePointer.addEventListener('change', stopMotion);
window.addEventListener('blur', stopMotion);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
window.addEventListener('pageshow', () => { navigating = false; stopMotion(); });
