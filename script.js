// script.js — Chaos HUD (self-contained) with bigger max values
// Changes: higher SPEED_MAX, speed slider max 2.5, step cap 18, higher glitch/burst limits, wider Randomize.
(() => {
  const CHAOS_CONTAINER = document.querySelector('.chaos');
  if (!CHAOS_CONTAINER) return;

  // ===== Inject HUD CSS + transform/glitch helpers (no external CSS needed) =====
  const HUD_CSS = `
  /* HUD panel */
  #chaos-hud{
    position: fixed; top: 12px; right: 12px; z-index: 9999; pointer-events: auto;
    color: #111; background: rgba(245, 247, 250, 0.85); border: 1px solid #aeb4bb; border-radius: 12px;
    backdrop-filter: blur(6px); box-shadow: 0 8px 22px rgba(0,0,0,.18); width: 320px;
    max-width: calc(100vw - 24px); font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px;
  }
  #chaos-hud[hidden]{ display:none!important; }
  #chaos-hud .hud-header{
    display:flex; align-items:center; justify-content:space-between; gap:8px;
    padding:8px 10px; user-select:none; cursor:move; border-bottom:1px solid #aeb4bb;
  }
  #chaos-hud .hud-title{ font-weight:700; letter-spacing:.02em; }
  #chaos-hud .hud-meta{ display:flex; gap:8px; align-items:center; color:#6e6a70; }
  #chaos-hud .hud-body{ padding:10px; max-height:70svh; overflow:auto; }
  #chaos-hud .row{ display:grid; grid-template-columns:1fr auto; gap:8px 10px; align-items:center; margin-bottom:10px; }
  #chaos-hud .sub{ grid-column:1 / -1; color:#6e6a70; margin-top:-6px; margin-bottom:2px; font-size:11px; }
  #chaos-hud input[type="range"]{ width:100%; accent-color:#0a0a0f; }
  #chaos-hud input[type="checkbox"]{ accent-color:#0a0a0f; }
  #chaos-hud .val{ min-width:56px; text-align:right; font-variant-numeric:tabular-nums; }
  #chaos-hud .btns{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:6px; }
  #chaos-hud button{
    padding:6px 8px; border-radius:9px; border:1px solid #aeb4bb; background:white; cursor:pointer; font-weight:600;
  }
  #chaos-hud button:hover{ filter:brightness(0.98); }
  #chaos-hud button:active{ transform:translateY(1px); }
  #chaos-hud :focus-visible{ outline:2px solid #0a0a0f; outline-offset:2px; }

  /* Extend .shape transform with skew/rotate via CSS vars.
     IMPORTANT: do NOT set --scale here; your classes (.xs/.sm/.md/.lg) keep control.
     We add --scaleMul (default 1) to multiply your base size when needed. */
  .shape{
    --tx: 0px; --ty: 0px;
    --scaleMul: 1;
    --rot: 0deg; --skewx: 0deg; --skewy: 0deg;
    transform:
      translate(var(--tx), var(--ty))
      scale(calc(var(--scale) * var(--scaleMul)))
      rotate(var(--rot)) skew(var(--skewx), var(--skewy))
      translateZ(0) !important;
  }

  /* Visual glitch effect (brief chromatic split) */
  .shape.glitch{
    filter:
      drop-shadow(0 2px 4px rgba(0,0,0,0.28))
      drop-shadow(-4px 0 0 rgba(0,255,255,0.25))
      drop-shadow(4px 0 0 rgba(255,0,255,0.25));
    opacity: 0.9;
  }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = HUD_CSS;
  document.head.appendChild(styleTag);

  // ===== Accessibility: respect reduced motion by default =====
  const MEDIA_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  let systemReduced = MEDIA_REDUCED.matches;
  let overrideReduced = false; // HUD toggle
  let paused = false;          // HUD toggle

  document.body.classList.add('js-chaos');

  // ===== Motion tuning (bigger max, still guarded) =====
  const MARGIN = 8;
  const SPEED_MIN = 90;   // px/sec baseline
  const SPEED_MAX = 800;  // ⬆ raised max speed ceiling
  const NUDGE = 0.06;     // gentler bounce desync
  const MAX_STEP = 18;    // ⬆ px/frame cap to allow higher top speed without warp

  // Glitch & burst defaults (tweakable in HUD)
  let glitchChance = 0.003;      // per-shape per second
  let burstChance  = 0.004;      // per-shape per second
  const SKEW_MAX = 4;            // deg during glitch
  const GLITCH_MIN = 0.08, GLITCH_MAX = 0.18; // seconds
  const BURST_MIN = 0.20, BURST_MAX = 0.45;   // seconds
  const BURST_BOOST_MIN = 1.2, BURST_BOOST_MAX = 1.7; // ⬆ slightly higher boost
  let wrapMode = false;          // HUD toggle

  // Viewport
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  // Shapes
  const shapes = Array.from(CHAOS_CONTAINER.querySelectorAll('.shape'));

  // ===== Speed control (non-linear slider mapping) =====
  // Wider slider top end; cubic mapping keeps the mid-range usable.
  let speedMult = 1.0; // effective multiplier after curve
  const sliderMin = 0.25;
  const sliderMax = 2.5; // ⬆ wider max

  const speedLinearToCurve = (v) => {
    const t = (v - sliderMin) / (sliderMax - sliderMin); // 0..1
    const eased = t * t * t; // cubic ease-in
    return sliderMin + eased * (sliderMax - sliderMin);
  };

  // ===== Movers (per-shape state) =====
  const movers = shapes.map(el => {
    const r = el.getBoundingClientRect();
    const w = r.width || 20;
    const h = r.height || 20;

    const x = rand(MARGIN, Math.max(MARGIN, vw - MARGIN - w));
    const y = rand(MARGIN, Math.max(MARGIN, vh - MARGIN - h));

    const speed = rand(SPEED_MIN, SPEED_MAX);
    const theta = rand(0, Math.PI * 2);
    let vx = Math.cos(theta) * speed;
    let vy = Math.sin(theta) * speed;

    // glitch/burst state per-shape
    let glitchTimer = 0;
    let burstTimer = 0;
    let skewx = 0, skewy = 0;
    let rot = 0; // reserved for potential wobble/rotation

    setVars(el, x, y, skewx, skewy, rot);
    return { el, w, h, x, y, vx, vy, glitchTimer, burstTimer, skewx, skewy, rot };
  });

  // ===== Animation =====
  let animEnabled = !(systemReduced && !overrideReduced);
  let last = performance.now();
  let rafId = 0;

  // FPS monitor (lightweight)
  let fps = 0, acc = 0, cnt = 0, lastFpsUpdate = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016; // stability cap
    last = now;

    // FPS calc
    const inst = 1 / dt;
    acc += inst; cnt++;
    if (now - lastFpsUpdate > 120) { // update ~8x/sec
      fps = Math.round(acc / cnt);
      acc = 0; cnt = 0; lastFpsUpdate = now;
      updateHudFPS(fps);
    }

    if (animEnabled && !paused) {
      for (const m of movers) {
        // ===== Guarded integration with per-frame step cap =====
        const vxEff = m.vx * speedMult;
        const vyEff = m.vy * speedMult;
        let dx = vxEff * dt;
        let dy = vyEff * dt;

        const stepLen = Math.hypot(dx, dy);
        if (stepLen > MAX_STEP && stepLen > 0) {
          const k = MAX_STEP / stepLen;
          dx *= k; dy *= k;
        }

        m.x += dx;
        m.y += dy;

        // ===== Edge handling =====
        if (!wrapMode) {
          // Bounce edges
          if (m.x <= MARGIN) {
            m.x = MARGIN;
            m.vx = Math.abs(m.vx) * (1 + (Math.random() - 0.5) * NUDGE);
          } else if (m.x + m.w >= vw - MARGIN) {
            m.x = vw - MARGIN - m.w;
            m.vx = -Math.abs(m.vx) * (1 + (Math.random() - 0.5) * NUDGE);
          }
          if (m.y <= MARGIN) {
            m.y = MARGIN;
            m.vy = Math.abs(m.vy) * (1 + (Math.random() - 0.5) * NUDGE);
          } else if (m.y + m.h >= vh - MARGIN) {
            m.y = vh - MARGIN - m.h;
            m.vy = -Math.abs(m.vy) * (1 + (Math.random() - 0.5) * NUDGE);
          }
        } else {
          // Wrap edges
          if (m.x + m.w < -MARGIN) m.x = vw + MARGIN;
          else if (m.x > vw + MARGIN) m.x = -m.w - MARGIN;
          if (m.y + m.h < -MARGIN) m.y = vh + MARGIN;
          else if (m.y > vh + MARGIN) m.y = -m.h - MARGIN;
        }

        // ===== Random burst (gentle, but higher ceiling) =====
        if (Math.random() < burstChance * dt * 60) {
          m.burstTimer = rand(BURST_MIN, BURST_MAX);
          const boost = rand(BURST_BOOST_MIN, BURST_BOOST_MAX);
          m.vx *= boost; m.vy *= boost;
        }
        if (m.burstTimer > 0) {
          m.burstTimer -= dt;
          if (m.burstTimer <= 0) {
            // ease back a bit
            m.vx *= 0.7; m.vy *= 0.7;
          }
        }

        // ===== Glitch skew (brief) =====
        if (Math.random() < glitchChance * dt * 60) {
          m.glitchTimer = rand(GLITCH_MIN, GLITCH_MAX);
          m.el.classList.add('glitch');
        }
        if (m.glitchTimer > 0) {
          m.glitchTimer -= dt;
          m.skewx = rand(-SKEW_MAX, SKEW_MAX);
          m.skewy = rand(-SKEW_MAX, SKEW_MAX);
          if (m.glitchTimer <= 0) {
            m.el.classList.remove('glitch');
            m.skewx = 0; m.skewy = 0;
          }
        }

        setVars(m.el, m.x, m.y, m.skewx, m.skewy, m.rot);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  // ===== Resize handling =====
  window.addEventListener('resize', () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    for (const m of movers) {
      if (!wrapMode) {
        m.x = clamp(m.x, MARGIN, Math.max(MARGIN, vw - MARGIN - m.w));
        m.y = clamp(m.y, MARGIN, Math.max(MARGIN, vh - MARGIN - m.h));
      }
      setVars(m.el, m.x, m.y, m.skewx, m.skewy, m.rot);
    }
  }, { passive: true });

  // ===== Reduced motion changes =====
  if (MEDIA_REDUCED.addEventListener) {
    MEDIA_REDUCED.addEventListener('change', (e) => {
      systemReduced = e.matches;
      recomputeAnimEnabled();
      updateHudReducedNote();
      updateHudPlayState();
    });
  } else if (MEDIA_REDUCED.addListener) {
    MEDIA_REDUCED.addListener((e) => {
      systemReduced = e.matches;
      recomputeAnimEnabled();
      updateHudReducedNote();
      updateHudPlayState();
    });
  }
  function recomputeAnimEnabled(){ animEnabled = !(systemReduced && !overrideReduced); }

  // ===== Utilities =====
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function setVars(el, x, y, skewx=0, skewy=0, rot=0){
    el.style.setProperty('--tx', `${x}px`);
    el.style.setProperty('--ty', `${y}px`);
    el.style.setProperty('--skewx', `${skewx}deg`);
    el.style.setProperty('--skewy', `${skewy}deg`);
    el.style.setProperty('--rot', `${rot}deg`);
  }
  function reseed(reposition = false) {
    for (const m of movers) {
      const speed = rand(SPEED_MIN, SPEED_MAX);
      const theta = rand(0, Math.PI * 2);
      m.vx = Math.cos(theta) * speed;
      m.vy = Math.sin(theta) * speed;
      m.glitchTimer = 0; m.burstTimer = 0;
      m.el.classList.remove('glitch');
      m.skewx = 0; m.skewy = 0; m.rot = 0;
      if (reposition) {
        m.x = rand(MARGIN, Math.max(MARGIN, vw - MARGIN - m.w));
        m.y = rand(MARGIN, Math.max(MARGIN, vh - MARGIN - m.h));
      }
      setVars(m.el, m.x, m.y, m.skewx, m.skewy, m.rot);
    }
  }

  // ======== HUD (higher max values) ========
  buildHUD();
  updateHudReducedNote();
  updateHudPlayState();
  updateHudFPS('—');

  function buildHUD(){
    const hud = document.createElement('section');
    hud.id = 'chaos-hud';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Chaos controls');
    hud.innerHTML = `
      <div class="hud-header">
        <div class="hud-title">Chaos HUD</div>
        <div class="hud-meta">
          <span id="hud-fps">FPS: —</span>
          <button type="button" id="hud-hide" title="Hide HUD (H)">Hide</button>
        </div>
      </div>
      <div class="hud-body">
        <div class="row">
          <label for="ovr">Override reduced motion</label>
          <input id="ovr" type="checkbox" />
          <div class="sub" id="reduced-note"></div>
        </div>

        <div class="row">
          <label for="speed">Speed</label>
          <input id="speed" type="range" min="${sliderMin}" max="${sliderMax}" step="0.05" value="1.0">
          <div class="val" id="speed-val">1.00</div>
        </div>

        <div class="row">
          <label for="glitch">Glitch chance</label>
          <input id="glitch" type="range" min="0" max="0.03" step="0.001" value="${glitchChance}">
          <div class="val" id="glitch-val">${glitchChance.toFixed(3)}</div>
          <div class="sub">Probability per shape per second of a brief skew/chromatic split.</div>
        </div>

        <div class="row">
          <label for="burst">Burst chance</label>
          <input id="burst" type="range" min="0" max="0.04" step="0.001" value="${burstChance}">
          <div class="val" id="burst-val">${burstChance.toFixed(3)}</div>
          <div class="sub">Probability per shape per second of a short speed boost.</div>
        </div>

        <div class="row">
          <label for="wrap">Wrap edges</label>
          <input id="wrap" type="checkbox" />
          <div class="sub">Off = bounce; On = wrap around screen edges.</div>
        </div>

        <div class="btns">
          <button type="button" id="btn-pause">Pause</button>
          <button type="button" id="btn-resume">Resume</button>
          <button type="button" id="btn-randomize">Randomize</button>
        </div>

        <div class="footer">
          <span>Press <b>H</b> to show/hide</span>
          <span></span>
        </div>
      </div>
    `;
    document.body.appendChild(hud);

    // Drag to move (header is the handle)
    enableDrag(hud.querySelector('.hud-header'), hud);

    // Wire up controls
    const speed = hud.querySelector('#speed');
    const speedVal = hud.querySelector('#speed-val');
    const wrap = hud.querySelector('#wrap');
    const ovr = hud.querySelector('#ovr');
    const glitch = hud.querySelector('#glitch');
    const glitchVal = hud.querySelector('#glitch-val');
    const burst = hud.querySelector('#burst');
    const burstVal = hud.querySelector('#burst-val');

    // Initialize effective speed (apply curve to initial slider value)
    const initialRaw = parseFloat(speed.value) || 1.0;
    const eff = speedLinearToCurve(initialRaw);
    speedMult = eff;
    speedVal.textContent = speedMult.toFixed(2);

    speed.addEventListener('input', () => {
      const raw = parseFloat(speed.value) || 1.0;
      const effective = speedLinearToCurve(raw);
      speedMult = effective;
      speedVal.textContent = speedMult.toFixed(2);
    });

    glitch.addEventListener('input', () => {
      glitchChance = clamp(parseFloat(glitch.value) || 0, 0, 0.03);
      glitchVal.textContent = glitchChance.toFixed(3);
    });

    burst.addEventListener('input', () => {
      burstChance = clamp(parseFloat(burst.value) || 0, 0, 0.04);
      burstVal.textContent = burstChance.toFixed(3);
    });

    wrap.addEventListener('change', () => { wrapMode = wrap.checked; });

    ovr.addEventListener('change', () => {
      overrideReduced = ovr.checked;
      recomputeAnimEnabled();
      updateHudReducedNote();
      updateHudPlayState();
    });

    document.getElementById('btn-pause').addEventListener('click', () => { paused = true; updateHudPlayState(); });
    document.getElementById('btn-resume').addEventListener('click', () => { paused = false; updateHudPlayState(); });

    // New: Randomize button (wider ranges to use the new max values)
    document.getElementById('btn-randomize').addEventListener('click', () => {
      randomizeSettings({ speed, speedVal, glitch, glitchVal, burst, burstVal, wrap });
    });

    // Hide/show HUD via button or 'H'
    document.getElementById('hud-hide').addEventListener('click', () => { hud.hidden = true; });
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h') hud.hidden = !hud.hidden;
    }, { passive: true });
  }

  // Randomize controls with wider bounds, apply, and lightly reseed directions
  function randomizeSettings(refs){
    const { speed, speedVal, glitch, glitchVal, burst, burstVal, wrap } = refs;

    // Wider but still sane (thanks to MAX_STEP guard)
    const randSpeedRaw = clamp(rand(0.6, 2.5), sliderMin, sliderMax);
    const randGlitch = clamp(rand(0.000, 0.025), 0, 0.03);
    const randBurst  = clamp(rand(0.000, 0.035), 0, 0.04);
    const randWrap   = Math.random() < 0.5;

    // Apply to UI
    speed.value = randSpeedRaw.toFixed(2);
    const eff = speedLinearToCurve(parseFloat(speed.value));
    speedMult = eff;
    speedVal.textContent = eff.toFixed(2);

    glitch.value = randGlitch.toFixed(3);
    glitchChance = parseFloat(glitch.value);
    glitchVal.textContent = glitchChance.toFixed(3);

    burst.value = randBurst.toFixed(3);
    burstChance = parseFloat(burst.value);
    burstVal.textContent = burstChance.toFixed(3);

    wrap.checked = randWrap;
    wrapMode = randWrap;

    // Light reseed (directions & speeds) without reposition to keep the composition
    reseed(false);
  }

  function updateHudFPS(val){
    const el = document.getElementById('hud-fps');
    if (el) el.textContent = `FPS: ${val}`;
  }
  function updateHudReducedNote(){
    const note = document.getElementById('reduced-note');
    if (!note) return;
    if (systemReduced && !overrideReduced) {
      note.textContent = 'System “reduced motion” is ON → animation is paused. Check the box to override.';
    } else if (systemReduced && overrideReduced) {
      note.textContent = 'Overriding system “reduced motion”.';
    } else {
      note.textContent = '';
    }
  }
  function updateHudPlayState(){
    const p = document.getElementById('btn-pause');
    const r = document.getElementById('btn-resume');
    if (!p || !r) return;
    const disabledBySystem = systemReduced && !overrideReduced;
    p.disabled = paused || disabledBySystem;
    r.disabled = !paused || disabledBySystem;
  }

  // Basic draggable HUD (header drag)
  function enableDrag(handle, panel){
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY;
      const r = panel.getBoundingClientRect();
      ox = r.left; oy = r.top;
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const nx = clamp(ox + dx, 6, window.innerWidth - panel.offsetWidth - 6);
      const ny = clamp(oy + dy, 6, window.innerHeight - panel.offsetHeight - 6);
      panel.style.left = nx + 'px';
      panel.style.top = ny + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.position = 'fixed';
    });
    handle.addEventListener('pointerup', (e) => {
      dragging = false;
      handle.releasePointerCapture(e.pointerId);
    });
  }
})();

/* =========================================================
   Random Square Pop-up (dismissible with top-right ✕)
   – Paste this at the END of your current script.js
   – No dependencies; styles injected automatically
   ========================================================= */
(() => {
  const MEDIA_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  const REDUCED = MEDIA_REDUCED.matches;

  // ----- Inject minimal CSS -----
  const CSS = `
  .chaos-popup {
    position: fixed;
    z-index: 99999;
    background: #ffffff;
    border: 2px solid #0a0a0f;
    box-shadow: 0 14px 36px rgba(0,0,0,.28);
    border-radius: 12px;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    min-width: 120px;
    min-height: 120px;
    will-change: transform, opacity;
  }
  .chaos-popup.appear {
    ${REDUCED ? '' : 'animation: chaos-pop-in 240ms cubic-bezier(.2,.8,.2,1) both;'}
  }
  @keyframes chaos-pop-in {
    from { transform: translateY(8px) scale(.96); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  .chaos-popup__bar {
    height: 36px;
    background: linear-gradient(180deg, #f3f6f9, #e5eaef);
    border-bottom: 1px solid #aeb4bb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    gap: 8px;
    user-select: none;
    cursor: move; /* draggable handle */
  }
  .chaos-popup__title {
    font: 700 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    letter-spacing: .02em;
    color: #111;
  }
  .chaos-popup__x {
    width: 28px;
    height: 24px;
    border: 1px solid #aeb4bb;
    border-radius: 8px;
    background: #fff;
    color: #111;
    cursor: pointer;
    display: grid; place-items: center;
    font-weight: 800;
  }
  .chaos-popup__x:hover { filter: brightness(.98); }
  .chaos-popup__x:active { transform: translateY(1px); }

  .chaos-popup__body {
    padding: 12px;
    color: #222;
    font: 500 12px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  }
  `;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const MIN_MS = 8000;   // min interval between spawns
  const MAX_MS = 18000;  // max interval between spawns
  const MIN_SIZE = 120;  // px (square)
  const MAX_SIZE = 260;  // px (square)
  let spawnTimer = 0;

  const popups = []; // track to support Esc-close of last/topmost

  function rand(min, max){ return Math.random() * (max - min) + min; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function spawnPopup(){
    const size = Math.round(rand(MIN_SIZE, MAX_SIZE));

    // Keep fully visible within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxLeft = Math.max(0, vw - size - 10);
    const maxTop  = Math.max(0, vh - size - 10);
    const left = Math.round(rand(10, maxLeft));
    const top  = Math.round(rand(10, maxTop));

    const el = document.createElement('section');
    el.className = 'chaos-popup appear';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.innerHTML = `
      <div class="chaos-popup__bar" aria-label="Popup title bar">
        <div class="chaos-popup__title">Evil Notice</div>
        <button type="button" class="chaos-popup__x" aria-label="Close">✕</button>
      </div>
      <div class="chaos-popup__body">
        <div>hehehehehe</div>
      </div>
    `;

    // Close on ✕
    el.querySelector('.chaos-popup__x').addEventListener('click', () => closePopup(el));

    // Optional: close on dblclick the bar
    el.querySelector('.chaos-popup__bar').addEventListener('dblclick', () => closePopup(el));

    // Draggable via title bar
    enableDrag(el.querySelector('.chaos-popup__bar'), el);

    // Add to DOM & stack tracker
    document.body.appendChild(el);
    popups.push(el);
  }

  function closePopup(el){
    const idx = popups.indexOf(el);
    if (idx >= 0) popups.splice(idx, 1);
    el.remove();
  }

  // Esc closes the most recent popup
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popups.length) {
      closePopup(popups[popups.length - 1]);
    }
  });

  // Manual spawn: Shift + P (useful for testing)
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key.toLowerCase?.() === 'p')) {
      spawnPopup();
    }
  });

  // Auto-spawn loop
  function scheduleNext(){
    const next = Math.round(rand(MIN_MS, MAX_MS));
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(() => {
      spawnPopup();
      scheduleNext();
    }, next);
  }
  scheduleNext();

  // Re-clamp if window resizes (keep popups on screen)
  window.addEventListener('resize', () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const el of popups) {
      const rect = el.getBoundingClientRect();
      const size = rect.width; // square
      let left = rect.left;
      let top  = rect.top;
      const maxLeft = Math.max(0, vw - size - 10);
      const maxTop  = Math.max(0, vh - size - 10);
      left = clamp(left, 0, maxLeft);
      top  = clamp(top, 0, maxTop);
      el.style.left = left + 'px';
      el.style.top  = top  + 'px';
    }
  }, { passive: true });

  // Simple draggable behavior using the header as the handle
  function enableDrag(handle, panel){
    let dragging = false;
    let startX=0, startY=0, left0=0, top0=0;

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      left0 = rect.left;
      top0 = rect.top;
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = panel.getBoundingClientRect().width; // square
      const maxLeft = Math.max(0, vw - size - 10);
      const maxTop  = Math.max(0, vh - size - 10);

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nx = clamp(left0 + dx, 0, maxLeft);
      const ny = clamp(top0 + dy, 0, maxTop);
      panel.style.left = nx + 'px';
      panel.style.top  = ny + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });

    handle.addEventListener('pointerup', (e) => {
      dragging = false;
      handle.releasePointerCapture(e.pointerId);
    });
  }
})();

