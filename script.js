// script.js
(() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CHAOS_CONTAINER = document.querySelector('.chaos');
  if (!CHAOS_CONTAINER) return;

  document.body.classList.add('js-chaos');

  const MARGIN = 8;                     // keep off the edges/frame a bit
  const SPEED_MIN = 140;                // px/sec (fast)
  const SPEED_MAX = 760;                // px/sec (faster)
  const NUDGE = 0.12;                   // small randomization on bounces to avoid syncing

  const shapes = Array.from(CHAOS_CONTAINER.querySelectorAll('.shape'));

  // Viewport bounds
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  // Each moving shape's state
  const movers = shapes.map(el => {
    // Force a layout measure AFTER styles apply
    const r = el.getBoundingClientRect();
    const w = r.width || 20;
    const h = r.height || 20;

    // Initial random position within viewport
    const x = rand(MARGIN, Math.max(MARGIN, vw - MARGIN - w));
    const y = rand(MARGIN, Math.max(MARGIN, vh - MARGIN - h));

    // Initial random velocity
    const speed = rand(SPEED_MIN, SPEED_MAX);
    const theta = rand(0, Math.PI * 2);
    let vx = Math.cos(theta) * speed;
    let vy = Math.sin(theta) * speed;

    // Apply initial transform
    setPos(el, x, y);

    return { el, w, h, x, y, vx, vy };
  });

  // If reduced motion, stop here (randomized positions only)
  if (REDUCED) return;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016; // cap delta for stability (~20 FPS max step)
    last = now;

    for (const m of movers) {
      // Integrate
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Bounce X
      if (m.x <= MARGIN) {
        m.x = MARGIN;
        m.vx = Math.abs(m.vx) * (1 + (Math.random() - 0.5) * NUDGE);
      } else if (m.x + m.w >= vw - MARGIN) {
        m.x = vw - MARGIN - m.w;
        m.vx = -Math.abs(m.vx) * (1 + (Math.random() - 0.5) * NUDGE);
      }

      // Bounce Y
      if (m.y <= MARGIN) {
        m.y = MARGIN;
        m.vy = Math.abs(m.vy) * (1 + (Math.random() - 0.5) * NUDGE);
      } else if (m.y + m.h >= vh - MARGIN) {
        m.y = vh - MARGIN - m.h;
        m.vy = -Math.abs(m.vy) * (1 + (Math.random() - 0.5) * NUDGE);
      }

      // Apply
      setPos(m.el, m.x, m.y);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // Handle resizes
  window.addEventListener('resize', () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    // Clamp all shapes into new bounds
    for (const m of movers) {
      m.x = clamp(m.x, MARGIN, Math.max(MARGIN, vw - MARGIN - m.w));
      m.y = clamp(m.y, MARGIN, Math.max(MARGIN, vh - MARGIN - m.h));
      setPos(m.el, m.x, m.y);
    }
  }, { passive: true });

  // Utilities
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function setPos(el, x, y){
    // Use CSS vars so we don't overwrite scale() in CSS
    el.style.setProperty('--tx', `${x}px`);
    el.style.setProperty('--ty', `${y}px`);
  }
})();