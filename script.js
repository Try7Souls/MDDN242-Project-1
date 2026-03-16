(function () {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // === Config (DENSER + FASTER) ===
  const CHAOS_MIN = 64;   // more items
  const CHAOS_MAX = 120;  // more items

  const SPEED_MIN = 180;  // px/s
  const SPEED_MAX = 420;  // px/s

  // Stationary popups: no limit, spawn faster
  const POPUP_MIN_MS = 6000;
  const POPUP_MAX_MS = 10000;
  // no POPUP_MAX cap

  // Blink cycle for chaos items (disappear + respawn)
  const BLINK_MIN_MS = 900;
  const BLINK_MAX_MS = 2500;
  const FADE_MS = 110;

  // Pools
  const words   = ["CHAOS","GLITCH","NOISE","SPARK","WILD","ECHO","PIXEL","FLUX","SHIFT","WOBBLE","ZAP","BOUNCE","WAVE","SPIN","DRIFT","BURST","SPARKLE","SWIRL","FIZZ","POP","BLIP","BLOOM","SHIMMER","GLOW","TWIST","TILT","SWOOP","ZIG","ZAG"];
  const phrases = ["Unstable text field","Everything everywhere now","Maximum entropy","This is fine (?)","Aesthetic turbulence","Abstract interface","Design in motion","Pattern in the noise","Reroll reality","Pixel storm"];
  const emojis  = ["✨","⚡️","💥","🌀","🎉","🔥","🌈","💫","🧪","🔮","🧩","🎯","🧷","🧵","🧿","🪩","⭐","🌟","❇️","❓","❗"];
  const glyphs  = ["◆","◇","●","○","■","□","▲","△","▼","▽","✦","✧","✺","✹","✸","✻","✼","✶","✷"];

  function randomColor() {
    const h = randInt(0, 360), s = randInt(50, 95), l = randInt(45, 70);
    return `hsl(${h} ${s}% ${l}%)`;
  }
  function randomDark() {
    const h = randInt(0, 360), s = randInt(30, 80), l = randInt(5, 18);
    return `hsl(${h} ${s}% ${l}%)`;
  }

  // DOM
  const layer = document.getElementById("chaosLayer");

  // State
  let running = true;
  /** @type {Array<{el:HTMLElement,x:number,y:number,w:number,h:number,vx:number,vy:number,type:'chaos'|'popup'|'about',static?:boolean,blinkTimer?:number}>} */
  let items = [];
  let last = null;
  let spawnTimer = null;

  function measure(el) {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }
  function setPos(item) {
    item.el.style.left = item.x + "px";
    item.el.style.top  = item.y + "px";
  }
  function bounds() {
    const w = layer.clientWidth || window.innerWidth;
    const h = layer.clientHeight || window.innerHeight;
    return { w, h };
  }

  // Randomize header/title only
  function randomizeMainCopy() {
    const headerTitle = document.querySelector(".title") || document.querySelector("h1");
    if (headerTitle) headerTitle.textContent = pick([...words, ...phrases]);
    document.title = pick(["Chaos Mode","Entropy Simulator","UI Anomaly","Text Storm","Glitch Garden"]);
  }

  // Create chaos visuals
  function makeShape(type, size) {
    const el = document.createElement("div");
    el.className = "chaos-item shape";
    el.style.width = el.style.height = size + "px";
    el.style.background = Math.random() < 0.5 ? randomColor() : "transparent";
    if (Math.random() < 0.6) el.style.border = `${Math.max(2, size*0.06)}px solid ${randomColor()}`;

    if (type === "circle") {
      el.style.borderRadius = "50%";
    } else if (type === "triangle") {
      el.style.width = 0; el.style.height = 0;
      const base = size, height = size;
      el.style.borderLeft   = `${base/2}px solid transparent`;
      el.style.borderRight  = `${base/2}px solid transparent`;
      el.style.borderBottom = `${height}px solid ${randomColor()}`;
      el.style.background = "transparent";
    } else {
      if (Math.random() < 0.5) el.style.transform = "rotate(45deg)";
      el.style.borderRadius = Math.random() < 0.5 ? rand(4, 18) + "px" : "0";
    }

    if (Math.random() < 0.25) el.style.mixBlendMode = pick(["multiply","screen","overlay","difference","hard-light"]);

    // Faster non-positional effects
    const effects = [];
    if (Math.random() < 0.7) effects.push(`spin ${rand(2,6).toFixed(2)}s linear infinite`);
    if (Math.random() < 0.7) effects.push(`pulse ${rand(0.8,1.6).toFixed(2)}s ease-in-out infinite alternate`);
    if (effects.length) el.style.animation = effects.join(", ");
    return el;
  }

  function makeTextNode() {
    const el = document.createElement("span");
    el.className = "chaos-item";
    const mode = pick(["word","phrase","emoji","glyph","mix"]);
    let content = "";
    if (mode === "word") content = pick(words);
    else if (mode === "phrase") content = pick(phrases);
    else if (mode === "emoji") content = pick(emojis);
    else if (mode === "glyph") content = pick(glyphs);
    else content = `${pick(words)} ${pick(glyphs)} ${pick(emojis)}`;
    el.textContent = content;

    const size = rand(12, 64);
    el.style.fontSize = size + "px";
    el.style.color = Math.random() < 0.15 ? "#fff" : randomColor();

    if (Math.random() < 0.18) {
      el.style.background = Math.random() < 0.5 ? randomDark() : randomColor();
      el.style.padding = `${Math.max(2, size*0.12)}px ${Math.max(6, size*0.22)}px`;
      el.style.borderRadius = rand(4, 16) + "px";
    }
    if (Math.random() < 0.25) el.style.textShadow = `0 2px 8px ${randomDark()}`;
    if (Math.random() < 0.2) el.style.letterSpacing = rand(-1, 3) + "px";
    if (Math.random() < 0.2) el.style.mixBlendMode = pick(["screen","multiply","soft-light","difference"]);

    const effects = [];
    if (Math.random() < 0.7) effects.push(`spin ${rand(3,8).toFixed(2)}s linear infinite`);
    if (Math.random() < 0.7) effects.push(`pulse ${rand(0.8,1.6).toFixed(2)}s ease-in-out infinite alternate`);
    if (effects.length) el.style.animation = effects.join(", ");
    return el;
  }

  // Special: moving About Me (click -> navigate)
  function makeAboutMe() {
    const el = document.createElement('div');
    el.className = 'chaos-item about-item';
    el.textContent = 'About Me';
    el.style.animation = `pulse ${rand(1.0,1.6).toFixed(2)}s ease-in-out infinite alternate`;
    el.addEventListener('click', () => { window.location.href = 'about.html'; });
    return el;
  }

  // Register a moving item
  function addMoving(el, type = 'chaos') {
    layer.appendChild(el);
    const r = el.getBoundingClientRect();
    const { w: bw, h: bh } = bounds();
    const x = rand(0, Math.max(0, bw - r.width));
    const y = rand(0, Math.max(0, bh - r.height));
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    let vx = 0, vy = 0;
    if (type === 'chaos' || type === 'about') {
      const speed = rand(SPEED_MIN, SPEED_MAX);
      const angle = rand(0, Math.PI * 2);
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    const item = { el, x, y, w: r.width, h: r.height, vx, vy, type, static: (type === 'popup') };
    items.push(item);
    return item;
  }

  function populateChaos(count) {
    if (!layer) return;
    // Remove existing chaos items (not popups, not about)
    items.forEach(i => {
      if (i.type === 'chaos') {
        if (i.blinkTimer) clearTimeout(i.blinkTimer);
        i.el.remove();
      }
    });
    items = items.filter(i => i.type !== 'chaos');

    // Ensure About Me exists
    if (!items.find(i => i.type === 'about') || !document.body.contains(items.find(i => i.type === 'about')?.el)) {
      const aboutEl = makeAboutMe();
      addMoving(aboutEl, 'about');
      // entrance
      aboutEl.style.opacity = '0';
      aboutEl.style.transform = 'scale(0.96)';
      requestAnimationFrame(() => {
        aboutEl.style.transition = `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`;
        aboutEl.style.opacity = '1';
        aboutEl.style.transform = 'scale(1)';
      });
    }

    for (let i = 0; i < count; i++) {
      const isShape = Math.random() < 0.35;
      const el = isShape
        ? makeShape(pick(["circle","square","diamond","triangle"]), randInt(16, 120))
        : makeTextNode();
      const it = addMoving(el, 'chaos');
      scheduleBlink(it);
      // entrance
      el.style.opacity = '0';
      el.style.transform = 'scale(0.96)';
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
    }
  }

  // Stationary popups (UNLIMITED)
  function spawnRandomPopup() {
    if (prefersReduced) return;

    const box = document.createElement('div');
    box.className = 'random-popup';
    box.setAttribute('aria-hidden', 'true');

    const header = document.createElement('div');
    header.className = 'random-popup__header';
    header.textContent = pick(["Notice", "Heads up", "FYI", "Ping", "Pop!"]);

    const body = document.createElement('div');
    body.className = 'random-popup__body';
    body.textContent = pick([
      "Chaos likes you.",
      "Edges are bouncy.",
      "Physics engaged.",
      "Maximum wiggle.",
      "Entropy rising."
    ]);

    const close = document.createElement('button');
    close.className = 'random-popup__close';
    close.type = 'button';
    close.textContent = '×';
    close.addEventListener('click', () => {
      box.remove();
      items = items.filter(i => i.el !== box);
    });

    box.appendChild(header);
    box.appendChild(close);
    box.appendChild(body);
    document.body.appendChild(box);
    makeDraggable(box);

    // Place once, do not move
    const { w: bw, h: bh } = bounds();
    const m = box.getBoundingClientRect();
    const x = rand(0, Math.max(0, bw - m.width));
    const y = rand(0, Math.max(0, bh - m.height));
    box.style.left = x + "px";
    box.style.top  = y + "px";

    // entrance animation
    box.style.opacity = '0';
    box.style.transform = 'scale(0.96)';
    requestAnimationFrame(() => {
      box.style.transition = `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`;
      box.style.opacity = '1';
      box.style.transform = 'scale(1)';
    });

    // Track as static (never moved by physics)
    items.push({ el: box, x, y, w: m.width, h: m.height, vx: 0, vy: 0, type: 'popup', static: true });

    queueNextPopup();
  }

  function queueNextPopup() {
    const delay = randInt(POPUP_MIN_MS, POPUP_MAX_MS);
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(spawnRandomPopup, delay);
  }

  // Blink cycle (chaos only)
  function scheduleBlink(item) {
    if (!item || item.type !== 'chaos') return;
    const delay = randInt(BLINK_MIN_MS, BLINK_MAX_MS);
    item.blinkTimer = setTimeout(() => blink(item), delay);
  }
  function blink(item) {
    if (!item || item.type !== 'chaos' || !item.el || !item.el.parentNode) return;
    const el = item.el;
    el.style.transition = `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`;
    el.style.opacity = '0';
    el.style.transform = 'scale(0.92)';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      items = items.filter(i => i !== item);
      const isShape = Math.random() < 0.35;
      const newEl = isShape
        ? makeShape(pick(["circle","square","diamond","triangle"]), randInt(16, 120))
        : makeTextNode();
      const newItem = addMoving(newEl, 'chaos');
      newEl.style.opacity = '0';
      newEl.style.transform = 'scale(0.96)';
      requestAnimationFrame(() => {
        newEl.style.transition = `transform ${FADE_MS}ms ease, opacity ${FADE_MS}ms ease`;
        newEl.style.opacity = '1';
        newEl.style.transform = 'scale(1)';
      });
      scheduleBlink(newItem);
    }, FADE_MS);
  }

  // Physics loop (chaos + about move; popups are stationary)
  function step(t) {
    if (!running) { last = t; return requestAnimationFrame(step); }
    if (last == null) last = t;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    const { w: bw, h: bh } = bounds();

    for (const it of items) {
      if (it.type === 'popup' || it.static === true) continue;

      it.x += it.vx * dt;
      it.y += it.vy * dt;

      if ((Math.random() < 0.02)) {
        const m = measure(it.el);
        if (m.w) it.w = m.w;
        if (m.h) it.h = m.h;
      }

      if (it.x <= 0) { it.x = 0; it.vx = Math.abs(it.vx); }
      if (it.y <= 0) { it.y = 0; it.vy = Math.abs(it.vy); }
      if (it.x + it.w >= bw) { it.x = bw - it.w; it.vx = -Math.abs(it.vx); }
      if (it.y + it.h >= bh) { it.y = bh - it.h; it.vy = -Math.abs(it.vy); }

      setPos(it);
    }
    requestAnimationFrame(step);
  }

  // Keyboard shortcuts (no UI panel)
  function wireShortcuts() {
    document.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "r") reroll();
      if (k === "p") toggleChaos();
      if (k === "c") clearChaos();
    });
  }

  function pauseChaos() {
    running = false;
    document.querySelectorAll('.chaos-item, .random-popup').forEach(el => el.style.animationPlayState = "paused");
  }
  function playChaos() {
    running = true;
    document.querySelectorAll('.chaos-item, .random-popup').forEach(el => el.style.animationPlayState = "running");
  }
  function toggleChaos() { running ? pauseChaos() : playChaos(); }

  function reroll() {
    randomizeMainCopy();
    populateChaos(randInt(CHAOS_MIN, CHAOS_MAX));
    if (!running) playChaos();
  }

  // Clear only chaos (keep popups and About Me)
  function clearChaos() {
    items.forEach(i => {
      if (i.type === 'chaos') {
        if (i.blinkTimer) clearTimeout(i.blinkTimer);
        i.el.remove();
      }
    });
    items = items.filter(i => i.type !== 'chaos');
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    randomizeMainCopy();
    populateChaos(randInt(CHAOS_MIN, CHAOS_MAX));
    wireShortcuts();

    // ✅ 1/1000 chance every 1 second
setInterval(() => {
  if (Math.random() < 0.010) {   // 0.1% = 1/1000 chance
    triggerJumpScare();
  }
}, 1000);
  
    if (!prefersReduced) {
   
      // Then continuous spawning
      queueNextPopup();
      requestAnimationFrame(step);
    }
  });

  // Re-clamp positions on resize (keep everything on-screen)
  let rAF = null;
  window.addEventListener("resize", () => {
    if (rAF) cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      const { w: bw, h: bh } = bounds();
      for (const it of items) {
        it.x = Math.min(it.x, Math.max(0, bw - it.w));
        it.y = Math.min(it.y, Math.max(0, bh - it.h));
        setPos(it);
      }
    });
  });
})();

// ✅ Make a popup draggable
function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;
  let isDown = false;

  const onMouseDown = (e) => {
    isDown = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.style.transition = "none"; // avoid floaty animation while dragging
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDown) return;
    el.style.left = (e.clientX - offsetX) + "px";
    el.style.top = (e.clientY - offsetY) + "px";
  };

  const onMouseUp = () => {
    isDown = false;
    el.style.transition = ""; // restore transitions
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  // You can change this to el.querySelector('.random-popup__header') if you only want the header draggable
  el.addEventListener("mousedown", onMouseDown);
}

// ✅ Show a jumpscare using your PNG
function triggerJumpScare() {
  const scare = document.createElement("div");
  scare.className = "jumpscare";

  // ✅ CHANGE THIS TO YOUR PNG FILE
  scare.innerHTML = `<img src="adobe_evil.PNG" alt="">`;

  document.body.appendChild(scare);

  // Remove after 1 second
  setTimeout(() => scare.remove(), 1000);
}
// ✅ Add your PNGs here
const CAMERA_REVEAL_IMAGES = [
  "DSC_01.JPG",
  "DSC_02.JPG",
  "DSC_03.JPG",
  "DSC_04.JPG",
];
// ===============================
// ✅ CAMERA EVENT SYSTEM
// ===============================

// A small camera icon will appear rarely.
// Clicking it will flash the screen & show a random image.

function spawnCameraEvent() {
  // 1/120 chance every cycle (adjustable)
  if (Math.random() > 0.0083) return; // ~1/120 ≈ rare

const cam = document.createElement("div");
  cam.className = "camera-popup";
  cam.textContent = "📸"; // ✅ CAMERA EMOJI

  // place it on one of the 4 edges
  const side = ["left","right","top","bottom"][Math.floor(Math.random()*4)];
  const offset = Math.random() * 70 + "vh";

  if (side === "left") {
    cam.style.left = "10px";
    cam.style.top = offset;
  }
  if (side === "right") {
    cam.style.right = "10px";
    cam.style.top = offset;
  }
  if (side === "top") {
    cam.style.top = "10px";
    cam.style.left = offset;
  }
  if (side === "bottom") {
    cam.style.bottom = "10px";
    cam.style.left = offset;
  }

  document.body.appendChild(cam);

  // ✅ Click behavior
  cam.addEventListener("click", () => {
    // flash
    const flash = document.createElement("div");
    flash.className = "screen-flash";
    document.body.appendChild(flash);

    // pick random image
    const reveal = document.createElement("div");
    reveal.className = "reveal-image";

    const img = document.createElement("img");
    img.src = CAMERA_REVEAL_IMAGES[Math.floor(Math.random() * CAMERA_REVEAL_IMAGES.length)];
    reveal.appendChild(img);

    document.body.appendChild(reveal);

    setTimeout(() => {
      flash.remove();
      reveal.remove();
    }, 3200);

    cam.remove();
  });

  // auto-remove after 8 seconds if not clicked
  setTimeout(() => cam.remove(), 8000);
}

// ✅ Call camera spawn occasionally
setInterval(spawnCameraEvent, 90); // check every second