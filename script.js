(function () {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // === Config (DENSER + FASTER) ===
  const CHAOS_MIN = 64;
  const CHAOS_MAX = 120;
  const SPEED_MIN = 180;
  const SPEED_MAX = 420;

  const POPUP_MIN_MS = 6000;
  const POPUP_MAX_MS = 10000;

  const BLINK_MIN_MS = 900;
  const BLINK_MAX_MS = 2500;
  const FADE_MS = 110;

  const words = ["CHAOS","GLITCH","NOISE","SPARK","WILD","ECHO","PIXEL","FLUX","SHIFT","WOBBLE","ZAP","BOUNCE","WAVE","SPIN","DRIFT","BURST","SPARKLE","SWIRL","FIZZ","POP","BLIP","BLOOM","SHIMMER","GLOW","TWIST","TILT","SWOOP","ZIG","ZAG"];
  const phrases = ["Unstable text field","Everything everywhere now","Maximum entropy","This is fine (?)","Aesthetic turbulence","Abstract interface","Design in motion","Pattern in the noise","Reroll reality","Pixel storm"];
  const emojis = ["✨","⚡️","💥","🌀","🎉","🔥","🌈","💫","🧪","🔮","🧩","🎯","🧷","🧵","🧿","🪩","⭐","🌟","❇️","❓","❗"];
  const glyphs = ["◆","◇","●","○","■","□","▲","△","▼","▽","✦","✧","✺","✹","✸","✻","✼","✶","✷"];

  function randomColor() {
    return `hsl(${randInt(0,360)} ${randInt(50,95)}% ${randInt(45,70)}%)`;
  }
  function randomDark() {
    return `hsl(${randInt(0,360)} ${randInt(30,80)}% ${randInt(5,18)}%)`;
  }

  const layer = document.getElementById("chaosLayer");
  let running = true;
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
    return {
      w: layer.clientWidth || window.innerWidth,
      h: layer.clientHeight || window.innerHeight
    };
  }

  function randomizeMainCopy() {
    const headerTitle = document.querySelector(".title") || document.querySelector("h1");
    if (headerTitle) headerTitle.textContent = pick([...words, ...phrases]);
    document.title = pick(["Chaos Mode","Entropy Simulator","UI Anomaly","Text Storm","Glitch Garden"]);
  }

  function makeShape(type, size) {
    const el = document.createElement("div");
    el.className = "chaos-item shape";
    el.style.width = el.style.height = size + "px";
    el.style.background = Math.random() < 0.5 ? randomColor() : "transparent";

    if (Math.random() < 0.6)
      el.style.border = `${Math.max(2, size*0.06)}px solid ${randomColor()}`;

    if (type === "circle") {
      el.style.borderRadius = "50%";
    } else if (type === "triangle") {
      el.style.width = 0; el.style.height = 0;
      const base = size;
      el.style.borderLeft = `${base/2}px solid transparent`;
      el.style.borderRight = `${base/2}px solid transparent`;
      el.style.borderBottom = `${size}px solid ${randomColor()}`;
      el.style.background = "transparent";
    } else {
      if (Math.random() < 0.5) el.style.transform = "rotate(45deg)";
      el.style.borderRadius = Math.random() < 0.5 ? rand(4,18) + "px" : "0";
    }

    if (Math.random() < 0.25)
      el.style.mixBlendMode = pick(["multiply","screen","overlay","difference","hard-light"]);

    const fx = [];
    if (Math.random() < 0.7) fx.push(`spin ${rand(2,6)}s linear infinite`);
    if (Math.random() < 0.7) fx.push(`pulse ${rand(0.8,1.6)}s ease-in-out infinite alternate`);
    if (fx.length) el.style.animation = fx.join(", ");
    return el;
  }

  function makeTextNode() {
    const el = document.createElement("span");
    el.className = "chaos-item";

    const mode = pick(["word","phrase","emoji","glyph","mix"]);
    if (mode === "word") el.textContent = pick(words);
    else if (mode === "phrase") el.textContent = pick(phrases);
    else if (mode === "emoji") el.textContent = pick(emojis);
    else if (mode === "glyph") el.textContent = pick(glyphs);
    else el.textContent = `${pick(words)} ${pick(glyphs)} ${pick(emojis)}`;

    const size = rand(12,64);
    el.style.fontSize = size + "px";
    el.style.color = Math.random() < 0.15 ? "#fff" : randomColor();

    if (Math.random() < 0.18) {
      el.style.background = Math.random() < 0.5 ? randomDark() : randomColor();
      el.style.padding = `${Math.max(2, size*0.12)}px ${Math.max(6, size*0.22)}px`;
      el.style.borderRadius = rand(4,16) + "px";
    }
    if (Math.random() < 0.25) el.style.textShadow = `0 2px 8px ${randomDark()}`;
    if (Math.random() < 0.2) el.style.letterSpacing = rand(-1,3) + "px";
    if (Math.random() < 0.2) el.style.mixBlendMode = pick(["screen","multiply","soft-light","difference"]);

    const fx = [];
    if (Math.random() < 0.7) fx.push(`spin ${rand(3,8)}s linear infinite`);
    if (Math.random() < 0.7) fx.push(`pulse ${rand(0.8,1.6)}s ease-in-out infinite alternate`);
    if (fx.length) el.style.animation = fx.join(", ");

    return el;
  }

  function makeAboutMe() {
    const el = document.createElement("div");
    el.className = "chaos-item about-item";
    el.textContent = "About Me";
    el.style.animation = `pulse ${rand(1.0,1.6)}s ease-in-out infinite alternate`;
    el.addEventListener("click", () => { window.location.href = "about.html"; });
    return el;
  }

  function addMoving(el, type = "chaos") {
    layer.appendChild(el);
    const r = el.getBoundingClientRect();
    const { w: bw, h: bh } = bounds();

    const x = rand(0, bw - r.width);
    const y = rand(0, bh - r.height);

    el.style.position = "absolute";
    el.style.left = x + "px";
    el.style.top = y + "px";

    let vx = 0, vy = 0;
    if (type === "chaos" || type === "about") {
      const speed = rand(SPEED_MIN, SPEED_MAX);
      const angle = rand(0, Math.PI*2);
      vx = Math.cos(angle)*speed;
      vy = Math.sin(angle)*speed;
    }

    const item = { el, x, y, w: r.width, h: r.height, vx, vy, type, static: type === "popup" };
    items.push(item);
    return item;
  }

  function populateChaos(count) {
    items.forEach(i => {
      if (i.type === "chaos") {
        if (i.blinkTimer) clearTimeout(i.blinkTimer);
        i.el.remove();
      }
    });
    items = items.filter(i => i.type !== "chaos");

    if (!items.find(i => i.type === "about")) {
      const aboutEl = makeAboutMe();
      addMoving(aboutEl, "about");
      aboutEl.style.opacity = "0";
      aboutEl.style.transform = "scale(0.96)";
      requestAnimationFrame(() => {
        aboutEl.style.transition = `transform ${FADE_MS}ms, opacity ${FADE_MS}ms`;
        aboutEl.style.opacity = "1";
        aboutEl.style.transform = "scale(1)";
      });
    }

    for (let i = 0; i < count; i++) {
      const el = Math.random() < 0.35
        ? makeShape(pick(["circle","square","diamond","triangle"]), randInt(16,120))
        : makeTextNode();
      const it = addMoving(el, "chaos");
      scheduleBlink(it);

      el.style.opacity = "0";
      el.style.transform = "scale(0.96)";
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FADE_MS}ms, opacity ${FADE_MS}ms`;
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
      });
    }
  }

  // ✅ SPECIAL POPUP: Clear all popups system
  function spawnClearAllPopup() {
    if (document.querySelector(".clear-all-popup")) return;

    const box = document.createElement("div");
    box.className = "random-popup clear-all-popup";
    box.style.background = "#ffecec";
    box.style.border = "2px solid #ff5c5c";

    const header = document.createElement("div");
    header.className = "random-popup__header";
    header.textContent = "Too Many Windows!";

    const body = document.createElement("div");
    body.className = "random-popup__body";
    body.textContent = "You have too many popups open. Want to clear them all?";

    const btn = document.createElement("button");
    btn.className = "random-popup__close";
    btn.textContent = "✓";
    btn.style.background = "#ffcccc";
    btn.style.border = "1px solid #ff8888";

    btn.addEventListener("click", () => {
      items.forEach(i => { if (i.type === "popup") i.el.remove(); });
      items = items.filter(i => i.type !== "popup");
      box.remove();
    });

    box.appendChild(header);
    box.appendChild(btn);
    box.appendChild(body);
    document.body.appendChild(box);

    box.style.left = "calc(50% - 110px)";
    box.style.top = "calc(50% - 110px)";
    box.style.opacity = "0";
    box.style.transform = "scale(0.9)";

    requestAnimationFrame(() => {
      box.style.transition = "opacity 120ms, transform 120ms";
      box.style.opacity = "1";
      box.style.transform = "scale(1)";
    });
  }

  function spawnRandomPopup() {
    if (prefersReduced) return;

    const box = document.createElement("div");
    box.className = "random-popup";
    box.setAttribute("aria-hidden", "true");

    const header = document.createElement("div");
    header.className = "random-popup__header";
    header.textContent = pick(["Notice","Heads up","FYI","Ping","Pop!"]);

    const body = document.createElement("div");
    body.className = "random-popup__body";
    body.textContent = pick(["Chaos likes you.","Edges are bouncy.","Physics engaged.","Maximum wiggle.","Entropy rising."]);

    const close = document.createElement("button");
    close.className = "random-popup__close";
    close.textContent = "×";

    close.addEventListener("click", () => {
      box.remove();
      items = items.filter(i => i.el !== box);
    });

    box.append(header, close, body);
    document.body.appendChild(box);
    makeDraggable(box);

    const { w: bw, h: bh } = bounds();
    const m = box.getBoundingClientRect();
    const x = rand(0, bw - m.width), y = rand(0, bh - m.height);

    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.opacity = "0";
    box.style.transform = "scale(0.96)";

    requestAnimationFrame(() => {
      box.style.transition = `transform ${FADE_MS}ms, opacity ${FADE_MS}ms`;
      box.style.opacity = "1";
      box.style.transform = "scale(1)";
    });

    items.push({ el: box, x, y, w: m.width, h: m.height, vx: 0, vy: 0, type: "popup", static: true });

    // ✅ POPUP COUNT CHECK
    const popupCount = items.filter(i => i.type === "popup").length;
    if (popupCount >= 10) spawnClearAllPopup();

    queueNextPopup();
  }

  function queueNextPopup() {
    const delay = randInt(POPUP_MIN_MS, POPUP_MAX_MS);
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(spawnRandomPopup, delay);
  }

  function scheduleBlink(item) {
    if (item.type !== "chaos") return;
    item.blinkTimer = setTimeout(() => blink(item), randInt(BLINK_MIN_MS, BLINK_MAX_MS));
  }

  function blink(item) {
    if (!item.el || !item.el.parentNode) return;

    const el = item.el;
    el.style.transition = `transform ${FADE_MS}ms, opacity ${FADE_MS}ms`;
    el.style.opacity = "0";
    el.style.transform = "scale(0.92)";

    setTimeout(() => {
      if (el.parentNode) el.remove();
      items = items.filter(i => i !== item);

      const newEl = Math.random() < 0.35
        ? makeShape(pick(["circle","square","diamond","triangle"]), randInt(16,120))
        : makeTextNode();

      const newItem = addMoving(newEl, "chaos");
      newEl.style.opacity = "0";
      newEl.style.transform = "scale(0.96)";

      requestAnimationFrame(() => {
        newEl.style.transition = `transform ${FADE_MS}ms, opacity ${FADE_MS}ms`;
        newEl.style.opacity = "1";
        newEl.style.transform = "scale(1)";
      });

      scheduleBlink(newItem);
    }, FADE_MS);
  }

  function step(t) {
    if (!running) { last = t; return requestAnimationFrame(step); }
    if (last == null) last = t;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    const { w: bw, h: bh } = bounds();
    for (const it of items) {
      if (it.type === "popup" || it.static) continue;

      it.x += it.vx * dt;
      it.y += it.vy * dt;

      if (Math.random() < 0.02) {
        const m = measure(it.el);
        it.w = m.w || it.w;
        it.h = m.h || it.h;
      }

      if (it.x <= 0) { it.x = 0; it.vx = Math.abs(it.vx); }
      if (it.y <= 0) { it.y = 0; it.vy = Math.abs(it.vy); }
      if (it.x + it.w >= bw) { it.x = bw - it.w; it.vx = -Math.abs(it.vx); }
      if (it.y + it.h >= bh) { it.y = bh - it.h; it.vy = -Math.abs(it.vy); }

      setPos(it);
    }

    requestAnimationFrame(step);
  }

  function wireShortcuts() {
    document.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (k === "r") reroll();
      if (k === "p") toggleChaos();
      if (k === "c") clearChaos();
    });
  }

  function pauseChaos() {
    running = false;
    document.querySelectorAll('.chaos-item, .random-popup')
      .forEach(el => el.style.animationPlayState = "paused");
  }

  function playChaos() {
    running = true;
    document.querySelectorAll('.chaos-item, .random-popup')
      .forEach(el => el.style.animationPlayState = "running");
  }

  function toggleChaos() { running ? pauseChaos() : playChaos(); }

  function reroll() {
    randomizeMainCopy();
    populateChaos(randInt(CHAOS_MIN, CHAOS_MAX));
    if (!running) playChaos();
  }

  function clearChaos() {
    items.forEach(i => {
      if (i.type === "chaos") {
        if (i.blinkTimer) clearTimeout(i.blinkTimer);
        i.el.remove();
      }
    });
    items = items.filter(i => i.type !== "chaos");
  }

  document.addEventListener("DOMContentLoaded", () => {
    randomizeMainCopy();
    populateChaos(randInt(CHAOS_MIN, CHAOS_MAX));
    wireShortcuts();

    setInterval(() => {
      if (Math.random() < 0.010) triggerJumpScare();
    }, 1000);

    if (!prefersReduced) {
      queueNextPopup();
      requestAnimationFrame(step);
    }
  });

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

// ✅ Draggable popups
function makeDraggable(el) {
  let isDown = false, offsetX = 0, offsetY = 0;

  const onMouseDown = e => {
    isDown = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = e => {
    if (!isDown) return;
    el.style.left = `${e.clientX - offsetX}px`;
    el.style.top = `${e.clientY - offsetY}px`;
  };

  const onMouseUp = () => {
    isDown = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  el.addEventListener("mousedown", onMouseDown);
}

// ✅ JUMPSCARE
function triggerJumpScare() {
  const scare = document.createElement("div");
  scare.className = "jumpscare";
  scare.innerHTML = `<img src="adobe_evil.PNG" alt="">`;
  document.body.appendChild(scare);
  setTimeout(() => scare.remove(), 1000);
}

// ✅ CAMERA IMAGES
const CAMERA_REVEAL_IMAGES = [
  "DSC_01.JPG",
  "DSC_02.JPG",
  "DSC_03.JPG",
  "DSC_04.JPG",
];

// ✅ CAMERA EVENT
function spawnCameraEvent() {
  if (Math.random() > 0.006) return;

  const cam = document.createElement("div");
  cam.className = "camera-popup";
  cam.textContent = "📸";

  const side = ["left","right","top","bottom"][Math.floor(Math.random()*4)];
  const offset = Math.random()*70 + "vh";

  if (side === "left") { cam.style.left="10px"; cam.style.top=offset; }
  if (side === "right") { cam.style.right="10px"; cam.style.top=offset; }
  if (side === "top") { cam.style.top="10px"; cam.style.left=offset; }
  if (side === "bottom") { cam.style.bottom="10px"; cam.style.left=offset; }

  document.body.appendChild(cam);

  cam.addEventListener("click", () => {
    const flash = document.createElement("div");
    flash.className = "screen-flash";
    document.body.appendChild(flash);

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

  setTimeout(() => cam.remove(), 8000);
}

setInterval(spawnCameraEvent, 90);