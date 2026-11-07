(function () {
  "use strict";

  var DATA_URL = "data/whales.json";
  var lang = pickLang();
  var data = null, byId = {};

  function pickLang() {
    try {
      var saved = localStorage.getItem("lang");
      if (saved === "es" || saved === "en") return saved;
    } catch (e) { /* private mode */ }
    return (navigator.language || "es").slice(0, 2) === "en" ? "en" : "es";
  }

  function t(key, vars) {
    var s = (window.STRINGS[lang] && window.STRINGS[lang][key]) || window.STRINGS.es[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }

  function locale() { return lang === "es" ? "es-ES" : "en-GB"; }
  function fmt(n) { return new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(n); }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.getElementById("lang").textContent = t("lang_switch");
    if (window.Sound) document.getElementById("sound").textContent = t(Sound.enabled() ? "sound_off" : "sound_on");
    if (window.Sea && Sea.getSpeed) applySpeed(Sea.getSpeed());
    if (window.Sea && Sea.kinds) renderSpecies();
    document.getElementById("screen-exit").textContent = t("screen_off");
    lastKey = "";
  }

  function dateText(iso) {
    var d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }

  // The story line: what she is doing right now, from the measured numbers.
  function storyLine(hero, info) {
    var under = Math.max(1, Math.round(Sea.underFor(hero) / 60));
    var d = hero.cur, slope = info.slope;   // metres per second, positive going down
    var baleen = hero.kind === "blue" || hero.kind === "fin" || hero.kind === "humpback";
    if (d < 25) {
      var up = Math.round(Sea.surfaceFor(hero) / 60);
      return up >= 1 ? t("phase_surface", { n: up }) : t("phase_surface_short");
    }
    if (slope > 0.25) {
      var rate = fmt(Math.round(slope * 60 / 5) * 5);
      if ((hero.kind === "cuvier" || hero.kind === "blainville") && d < 400) return t("phase_quiet", { n: under });
      return d > 200 && !baleen ? t("phase_descend_dark", { rate: rate }) : t("phase_descend", { rate: rate, n: under });
    }
    if (slope < -0.25) return t("phase_ascend", { n: under });
    if (baleen) {
      var w = byId[hero.id], dive = w && w.dives.filter(function (dv) { return hero.sec >= dv.t && hero.sec <= dv.t + dv.dur; })[0];
      if (hero.kind === "humpback") return dive && dive.lunges ? t("phase_roll", { d: fmt(Math.round(d / 5) * 5), n: under }) : t("phase_bottom_baleen", { d: fmt(Math.round(d / 5) * 5), n: under });
      return dive && dive.lunges ? t("phase_lunge", { d: fmt(Math.round(d / 10) * 10), n: under }) : t("phase_bottom_baleen", { d: fmt(Math.round(d / 10) * 10), n: under });
    }
    return t("phase_bottom", { d: fmt(Math.round(d / 10) * 10), n: under });
  }

  function whoText(hero) {
    var key = hero.kind && hero.kind !== "sperm" ? "whale_" + hero.kind : "whale";
    return t(key, { id: hero.id });
  }

  var FACTS = { cuvier: "fact_beaked", blainville: "fact_beaked", pilot: "fact_pilot", beluga: "fact_beluga", narwhal: "fact_narwhal" };

  function bioText(w) {
    if (!w) return "";
    if (w.kind === "humpback") {
      var when = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(w.tagged + "T12:00:00Z"));
      return t("bio_humpback", { name: w.id, when: when, hours: fmt(w.record_hours), dives: fmt(w.record_dives), max: fmt(w.record_max), min: fmt(w.record_longest_min), rolls: fmt(w.record_lunges) }) + t("bio_humpback_drawn");
    }
    if (w.kind === "narwhal") {
      return t("bio_narwhal", { date: dateText(w.tagged), site: t("site_" + w.site), days: fmt(w.record_days), dives: fmt(w.record_dives), max: fmt(w.record_max), min: fmt(w.record_longest_min) }) + " " + t(FACTS[w.kind]);
    }
    if (w.site) {
      var what = (w.sex === "m" ? t("sex_m") : w.sex === "f" ? t("sex_f") : t("whale_" + w.kind, { id: "" }).trim()) + (w.stage ? " " + t("stage_" + w.stage) : "");
      var b = t("bio_toothed", { what: what, date: dateText(w.tagged), site: t("site_" + w.site), every: w.step >= 120 ? t("every_min", { n: fmt(Math.round(w.step / 60 * 2) / 2) }) : t("every_s", { n: fmt(w.step) }), days: fmt(w.record_days), max: fmt(w.record_max) });
      if (w.record_longest_min) b += t("bio_toothed_long", { min: fmt(w.record_longest_min) });
      if (w.mass_kg) b += t("bio_mass", { kg: fmt(w.mass_kg) });
      b += t("bio_coarse");
      if (FACTS[w.kind]) b += " " + t(FACTS[w.kind]);
      return b;
    }
    if (w.kind === "blue" || w.kind === "fin") {
      var parts = [t("bio_baleen", { sex: w.sex === "m" ? t("sex_m") : w.sex === "f" ? t("sex_f") : t("whale_" + w.kind, { id: "" }).trim(),
        date: dateText(w.tagged), days: fmt(w.record_days), dives: fmt(w.record_dives), lunges: fmt(w.record_lunges), max: fmt(w.record_max), min: fmt(w.record_longest_min) })];
      if (w.also_tagged) parts.push(t("bio_also", { date: dateText(w.also_tagged) }));
      parts.push(t("bio_drawn"));
      return parts.join(" ");
    }
    return t("bio", { date: dateText(w.tagged), days: fmt(w.record_days), dives: fmt(w.record_dives), max: fmt(w.record_max), min: fmt(w.record_longest_min) });
  }

  // For the children: her depth in floors or towers, her breath against theirs.
  function kidLine(hero) {
    var d = Math.round(hero.cur);
    if (d < 8) return t("kid_surface");
    var s = d >= 330 ? t("kid_depth_towers", { n: fmt(Math.round(d / 330 * 10) / 10) }) : t("kid_depth_floors", { n: fmt(Math.max(1, Math.round(d / 3))) });
    var under = Math.round(Sea.underFor(hero) / 60);
    return s + (under >= 2 ? t("kid_breath", { n: fmt(under) }) : t("kid_breath_short"));
  }
  var lastKey = "", wasBelow = null, lastHero = null, hintUntil = 0, wasUnder = false, underHero = null, globeHero = null;
  function onTick(hero, whales, surfaceY, info) {
    if (hero && window.Sound) {
      if (hero !== underHero) { underHero = hero; wasUnder = hero.cur > 50; }
      var surfaced = false;
      if (hero.cur > 50) wasUnder = true;
      else if (wasUnder && hero.cur < 6) { wasUnder = false; surfaced = true; }
      Sound.update(hero.cur, info ? info.slope : 0, surfaced, hero.kind);
    }
    var below = surfaceY < 70 || (info && info.night > 0.5);
    if (below !== wasBelow) { wasBelow = below; document.body.classList.toggle("below", below); }
    if (!hero) return;
    var w = byId[hero.id];
    if (hero !== lastHero) {
      lastHero = hero;
      document.getElementById("deep-bio").textContent = bioText(w);
      if (window.Globe && w && typeof w.lat === "number") {
        Globe.show(w.lat, w.lon);
        document.getElementById("globe-place").textContent = t("place_" + w.place);
        document.getElementById("globe-label").textContent = t(w.place_approx ? "place_approx" : "place_tagged");
      }
    }
    var d = Math.round(hero.cur / 5) * 5;
    var lt = Sea.localTime(hero);
    var key = hero.id + ":" + d + ":" + (lt ? Math.floor(lt.getTime() / 60000) : 0);
    if (key === lastKey) return;
    lastKey = key;
    document.getElementById("deep-depth").textContent = t("depth_m", { n: fmt(d) });
    document.getElementById("deep-who").textContent = whoText(hero);
    document.getElementById("deep-story").textContent = storyLine(hero, info);
    document.getElementById("deep-kid").textContent = kidLine(hero);
    if (lt) {
      var ds = new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(lt);
      var ts = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(lt);
      document.getElementById("deep-sub").textContent = t("clock", { date: ds, time: ts }) + " · " + (Sea.realTime() ? t("speed_real") : t("speed_fast", { x: Sea.getSpeed() }));
    }
  }

  var aboutKind = null, portraitRaf = 0;
  var ABOUT_PALETTE = { sperm: ["#2f5276", "#223f5e", "#182f49", "#102238", "#0a1729", "#0a1729"], blue: ["#8fb5cc", "#6c95b2", "#527a98", "#3d607c", "#2a475f", "#2a475f"], fin: ["#6f8ea6", "#56758d", "#415c74", "#2f465b", "#223445", "#c9d6dd"], cuvier: ["#8f8a7a", "#716c5e", "#5a5648", "#454236", "#302e26", "#302e26"], blainville: ["#6f7d86", "#56646e", "#424f58", "#323d45", "#242c33", "#d8dde0"], pilot: ["#2b3340", "#1f2630", "#161c24", "#0f131a", "#0a0d12", "#0a0d12"], beluga: ["#f4f7f8", "#dfe7eb", "#c3d1d8", "#a7b9c3", "#8ea3ae", "#8ea3ae"], narwhal: ["#b9c2c6", "#949fa5", "#717c83", "#545d64", "#3b4349", "#e8ece9"], humpback: ["#4a5a66", "#38474f", "#2b373f", "#1f2930", "#151c22", "#dfe6ea"] };

  function drawPortrait(kind) {
    var c = document.getElementById("about-portrait");
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    // The cel whale when the 3D layer is in; the canvas then belongs to WebGL and keeps a styled background.
    if (window.Scene && window.Scene.ready) { c.classList.add("gl"); if (window.Scene.portrait(c, kind)) return; }
    if (c.classList.contains("gl")) return;   // the canvas belongs to WebGL once it has drawn there
    c.width = w * dpr; c.height = h * dpr;
    var ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // A little water behind her.
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(66, 174, 203, 0.35)"); g.addColorStop(1, "rgba(16, 60, 96, 0.35)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();
    var scale = Math.min(w / 100 * 0.7, h / 44 * 0.9) * (kind === "narwhal" ? 0.75 : 1);
    ctx.save();
    ctx.translate(w / 2 + (kind === "narwhal" ? w * 0.08 : 0), h / 2 + 4);
    ctx.scale(scale, scale);
    Whales.draw(ctx, kind, { shade: ABOUT_PALETTE[kind] || ABOUT_PALETTE.sperm, t: performance.now(), speed: 0.15, seam: 0.3 });
    ctx.restore();
    if (!document.getElementById("about").hidden) portraitRaf = requestAnimationFrame(function () { drawPortrait(kind); });
  }

  function hereText(kind) {
    var ws = data.whales.filter(function (w) { return (w.kind || "sperm") === kind; });
    if (!ws.length) return "";
    var max = Math.max.apply(null, ws.map(function (w) { return w.record_max || 0; }));
    var min = Math.max.apply(null, ws.map(function (w) { return w.record_longest_min || 0; }));
    return t(ws.length === 1 ? "here_one" : "here_many", { n: fmt(ws.length), max: fmt(max), min: fmt(min) });
  }

  function renderAbout(kind) {
    aboutKind = kind;
    cancelAnimationFrame(portraitRaf);
    document.getElementById("about-name").textContent = t("sp_" + kind + "_name");
    document.getElementById("about-latin").textContent = t("sp_" + kind + "_latin");
    document.getElementById("about-status").textContent = t("sp_" + kind + "_status").replace(/\.$/, "");
    document.getElementById("about-here").textContent = hereText(kind);
    var grid = document.getElementById("about-grid");
    grid.innerHTML = "";
    ["kid", "wow", "size", "weight", "lives", "dives", "eats", "sounds"].forEach(function (f) {
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.innerHTML = '<svg><use href="#i-' + f + '"/></svg><span></span>';
      dt.querySelector("span").textContent = t("sp_" + f);
      dd.textContent = t("sp_" + kind + "_" + f);
      if (f === "kid" || f === "wow") dd.className = "about-" + f;
      grid.appendChild(dt); grid.appendChild(dd);
    });
    drawPortrait(kind);
  }

  var chosenKind = null;
  function kindList() { return [null].concat(Sea.kinds()); }
  function kindName(kind) { return t(kind ? "kind_" + kind : "kind_all"); }
  // A small silhouette of the species, drawn with the 2D shapes in the panel's colours.
  function silhouette(kind, w, h, color) {
    var c = document.createElement("canvas"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = h * dpr;
    if (!kind || !window.Whales) return c;
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var s = Math.min(w / 100 * 0.92, h / 44 * 0.95) * (kind === "narwhal" ? 0.8 : 1);
    ctx.translate(w / 2 + (kind === "narwhal" ? w * 0.06 : 0), h / 2 + 1); ctx.scale(s, s);
    Whales.draw(ctx, kind, { shade: [color, color, color, color, color, color], t: 0, speed: 0, flat: true, seam: 0 });
    return c;
  }
  function renderSpecies() {
    var el = document.getElementById("species-label");
    el.innerHTML = "";
    if (chosenKind) el.appendChild(silhouette(chosenKind, 44, 20, "currentColor"));
    el.appendChild(document.createTextNode(kindName(chosenKind)));
  }
  function stepSpecies(dir) {
    var list = kindList(), i = list.indexOf(chosenKind);
    chosenKind = list[(i + dir + list.length) % list.length];
    Sea.chooseKind(chosenKind);
    renderSpecies();
  }

  function countOf(kind) { return data.whales.filter(function (w) { return (w.kind || "sperm") === kind; }).length; }
  // A menu with every species: on the stage (with "Todas") or in the sheet.
  function buildMenu(id, kinds, current, onPick) {
    var m = document.getElementById(id);
    m.innerHTML = "";
    kinds.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = k === current ? "active" : "";
      var label = document.createElement("strong"); label.style.fontWeight = "400";
      label.textContent = id === "species-menu" ? kindName(k) : t("sp_" + k + "_name");
      var n = document.createElement("span");
      n.textContent = k ? fmt(countOf(k)) : fmt(data.whales.length);
      b.appendChild(silhouette(k, 44, 20, k === current ? "#9ee9e2" : "#eaf7f6")); b.appendChild(label); b.appendChild(n);
      b.addEventListener("click", function (e) { e.stopPropagation(); m.hidden = true; onPick(k); });
      m.appendChild(b);
    });
    m.hidden = !m.hidden;
  }

  var SPEEDS = [1, 10, 30, 90];
  function applySpeed(x) {
    Sea.setSpeed(x);
    document.getElementById("speed").textContent = x === 1 ? t("speed_real_label") : t("speed_label", { x: x });
    document.getElementById("speed").classList.toggle("active", x !== 90);
    lastKey = "";
  }

  function start() {
    applyStatic();
    fetch(DATA_URL, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      d.whales.forEach(function (w) { byId[w.id] = w; });
      var q = new URLSearchParams(location.search);
      if (window.Globe) Globe.init(document.getElementById("globe"), "data/land.json?v=41");
      Sea.init(document.getElementById("sea"), d, {
        whale: q.get("whale"), at: q.has("at") ? parseFloat(q.get("at")) : undefined, gallery: q.has("gallery"),
        onTick: onTick,
        tick: function (m) { return t("tick", { n: fmt(m) }); }
      });
      renderSpecies();
      var saved = 90;
      try { saved = parseInt(localStorage.getItem("speed") || "90", 10); } catch (e) { /* private mode */ }
      applySpeed(SPEEDS.indexOf(saved) >= 0 ? saved : 90);
      var hint = document.getElementById("hint");
      hint.textContent = t("hint");
      hint.hidden = false;
      setTimeout(function () { hint.classList.add("gone"); }, 9000);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) Sea.pause(); else Sea.resume();
      });
    });

    document.getElementById("lang").addEventListener("click", function () {
      lang = lang === "es" ? "en" : "es";
      try { localStorage.setItem("lang", lang); } catch (e) { /* private mode */ }
      lastHero = null;
      applyStatic();
      document.getElementById("hint").textContent = t("hint");
      renderSpecies();
    });
    // Modo pantalla: full screen, wake lock, no interface. ?pantalla is the kiosk the
    // macOS screen saver loads: it starts on its own, with no exit button and no cursor.
    var kiosk = new URLSearchParams(location.search).has("pantalla");
    var S = { on: false, lock: null, idle: 0 };
    var fullBtn = document.getElementById("full"), exitBtn = document.getElementById("screen-exit");
    function fullHint() {
      var app = matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || navigator.standalone;
      var seen = false;
      try { seen = !!sessionStorage.getItem("ballenas.fsHint"); } catch (e) { /* private mode */ }
      if (document.fullscreenEnabled || app || seen) return;
      try { sessionStorage.setItem("ballenas.fsHint", "1"); } catch (e) { /* private mode */ }
      var el = document.createElement("div");
      el.className = "fs-hint";
      el.setAttribute("role", "status");
      el.textContent = t("fs_hint");
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add("in"); });
      setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 600); }, 7000);
    }
    function lockScreen() { try { navigator.wakeLock.request("screen").then(function (l) { S.lock = l; }).catch(function () {}); } catch (e) { /* no wake lock */ } }
    function enterScreen() {
      if (S.on) return;
      S.on = true;
      fullHint();
      document.body.classList.add("screen");
      exitBtn.hidden = false;
      var fs = document.documentElement;
      try { (fs.requestFullscreen || fs.webkitRequestFullscreen).call(fs).catch(function () {}); } catch (e) { /* not allowed */ }
      lockScreen();
      still();
    }
    function exitScreen() {
      if (!S.on) return;
      S.on = false;
      document.body.classList.remove("screen", "still-mouse");
      exitBtn.hidden = true;
      if (document.fullscreenElement || document.webkitFullscreenElement) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch(function () {}); } catch (e) { /* ignore */ } }
      if (S.lock) { S.lock.release().catch(function () {}); S.lock = null; }
    }
    function still() {
      clearTimeout(S.idle);
      S.idle = setTimeout(function () { if (S.on) document.body.classList.add("still-mouse"); }, 2500);
    }
    fullBtn.addEventListener("click", enterScreen);
    exitBtn.addEventListener("click", exitScreen);
    document.addEventListener("visibilitychange", function () { if (S.on && !document.hidden) lockScreen(); });
    function onFullChange() { if (!(document.fullscreenElement || document.webkitFullscreenElement) && S.on && !kiosk) exitScreen(); }
    document.addEventListener("fullscreenchange", onFullChange);
    document.addEventListener("webkitfullscreenchange", onFullChange);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !kiosk) exitScreen(); });
    document.addEventListener("pointermove", function () { if (!S.on) return; document.body.classList.remove("still-mouse"); still(); }, { passive: true });
    if (kiosk) { document.body.classList.add("kiosk"); setTimeout(enterScreen, 1200); }

    // Outside screen mode, the pills fade when idle and come back on a touch.
    var idleTimer = null;
    function wake() {
      document.body.classList.remove("idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { document.body.classList.add("idle"); }, 6000);
    }
    ["pointermove", "pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
    wake();

    document.getElementById("speed").addEventListener("click", function () {
      var x = SPEEDS[(SPEEDS.indexOf(Sea.getSpeed()) + 1) % SPEEDS.length];
      applySpeed(x);
      try { localStorage.setItem("speed", String(x)); } catch (e) { /* private mode */ }
    });
    document.getElementById("species-prev").addEventListener("click", function () { stepSpecies(-1); });
    document.getElementById("species-next").addEventListener("click", function () { stepSpecies(1); });
    document.getElementById("species-label").addEventListener("click", function (e) {
      e.stopPropagation();
      buildMenu("species-menu", kindList(), chosenKind, function (k) { chosenKind = k; Sea.chooseKind(k); renderSpecies(); });
    });
    document.getElementById("about-name").addEventListener("click", function (e) {
      e.stopPropagation();
      buildMenu("about-menu", Sea.kinds(), aboutKind, function (k) { renderAbout(k); });
    });
    document.addEventListener("click", function () { document.getElementById("species-menu").hidden = true; document.getElementById("about-menu").hidden = true; });
    document.getElementById("about-prev").addEventListener("click", function () { var k = Sea.kinds(); renderAbout(k[(k.indexOf(aboutKind) - 1 + k.length) % k.length]); });
    document.getElementById("about-next").addEventListener("click", function () { var k = Sea.kinds(); renderAbout(k[(k.indexOf(aboutKind) + 1) % k.length]); });
    document.getElementById("sound").addEventListener("click", function () {
      var on = Sound.toggle();
      document.getElementById("sound").textContent = t(on ? "sound_off" : "sound_on");
      document.getElementById("sound").classList.toggle("active", on);
    });
    document.getElementById("about-open").addEventListener("click", function () {
      document.getElementById("about").hidden = false;
      renderAbout(lastHero ? lastHero.kind : "sperm");
    });
    document.getElementById("about-close").addEventListener("click", function () { document.getElementById("about").hidden = true; cancelAnimationFrame(portraitRaf); });
    document.getElementById("about").addEventListener("click", function (e) { if (e.target === e.currentTarget) { e.currentTarget.hidden = true; cancelAnimationFrame(portraitRaf); } });
    document.getElementById("credits-open").addEventListener("click", function () {
      document.getElementById("credits").hidden = false;
    });
    document.getElementById("credits-close").addEventListener("click", function () {
      document.getElementById("credits").hidden = true;
    });
    document.getElementById("credits").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
  }

  start();
  // The 3D models, credited by title, author and licence.
  fetch("models/manifest.json?v=41").then(function (r) { return r.json(); }).then(function (man) {
    var ul = document.getElementById("credits-models"), seen = {};
    if (!ul) return;
    Object.keys(man).forEach(function (k) {
      var m = man[k]; if (seen[m.url]) return; seen[m.url] = 1;
      var li = document.createElement("li");
      var a = document.createElement("a"); a.href = m.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = m.title;
      var b = document.createElement("a"); b.href = m.author_url; b.target = "_blank"; b.rel = "noopener"; b.textContent = m.author;
      var c = document.createElement("a"); c.href = m.license_url; c.target = "_blank"; c.rel = "noopener"; c.textContent = m.license;
      li.appendChild(a); li.appendChild(document.createTextNode(", ")); li.appendChild(b); li.appendChild(document.createTextNode(", ")); li.appendChild(c);
      ul.appendChild(li);
    });
  }).catch(function () {});
})();
