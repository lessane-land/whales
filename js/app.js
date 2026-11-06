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
    if (window.Sea && Sea.realTime) document.getElementById("real").textContent = t(Sea.realTime() ? "real_on" : "real_off");
    document.getElementById("full").textContent = t((document.fullscreenElement || document.webkitFullscreenElement) ? "full_off" : "full_on");
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

  var lastKey = "", wasBelow = null, lastHero = null, hintUntil = 0, wasUnder = false, underHero = null;
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
    }
    var d = Math.round(hero.cur / 5) * 5;
    var lt = Sea.localTime(hero);
    var key = hero.id + ":" + d + ":" + (lt ? Math.floor(lt.getTime() / 60000) : 0);
    if (key === lastKey) return;
    lastKey = key;
    document.getElementById("deep-depth").textContent = t("depth_m", { n: fmt(d) });
    document.getElementById("deep-who").textContent = whoText(hero);
    document.getElementById("deep-story").textContent = storyLine(hero, info);
    if (lt) {
      var ds = new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(lt);
      var ts = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(lt);
      document.getElementById("deep-sub").textContent = t("clock", { date: ds, time: ts }) + (Sea.realTime() ? " · " + t("speed_real") : "");
    }
  }

  var aboutKind = null, portraitRaf = 0;
  var ABOUT_PALETTE = { sperm: ["#2f5276", "#223f5e", "#182f49", "#102238", "#0a1729", "#0a1729"], blue: ["#8fb5cc", "#6c95b2", "#527a98", "#3d607c", "#2a475f", "#2a475f"], fin: ["#6f8ea6", "#56758d", "#415c74", "#2f465b", "#223445", "#c9d6dd"], cuvier: ["#8f8a7a", "#716c5e", "#5a5648", "#454236", "#302e26", "#302e26"], blainville: ["#6f7d86", "#56646e", "#424f58", "#323d45", "#242c33", "#d8dde0"], pilot: ["#2b3340", "#1f2630", "#161c24", "#0f131a", "#0a0d12", "#0a0d12"], beluga: ["#f4f7f8", "#dfe7eb", "#c3d1d8", "#a7b9c3", "#8ea3ae", "#8ea3ae"], narwhal: ["#b9c2c6", "#949fa5", "#717c83", "#545d64", "#3b4349", "#e8ece9"], humpback: ["#4a5a66", "#38474f", "#2b373f", "#1f2930", "#151c22", "#dfe6ea"] };

  function drawPortrait(kind) {
    var c = document.getElementById("about-portrait");
    var dpr = Math.min(window.devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
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
    var nav = document.getElementById("about-kinds");
    nav.innerHTML = "";
    Sea.kinds().forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (k === kind ? " active" : "");
      b.textContent = t("sp_" + k + "_name");
      b.addEventListener("click", function () { renderAbout(k); });
      nav.appendChild(b);
    });
    document.getElementById("about-name").textContent = t("sp_" + kind + "_name");
    document.getElementById("about-latin").textContent = t("sp_" + kind + "_latin");
    document.getElementById("about-status").textContent = t("sp_" + kind + "_status").replace(/\.$/, "");
    document.getElementById("about-here").textContent = hereText(kind);
    var grid = document.getElementById("about-grid");
    grid.innerHTML = "";
    [["size", false], ["weight", false], ["lives", true], ["dives", true], ["eats", false], ["sounds", false]].forEach(function (f) {
      var card = document.createElement("article");
      card.className = "about-card" + (f[1] ? " wide" : "");
      card.innerHTML = '<svg><use href="#i-' + f[0] + '"/></svg><div><h3></h3><p></p></div>';
      card.querySelector("h3").textContent = t("sp_" + f[0]);
      card.querySelector("p").textContent = t("sp_" + kind + "_" + f[0]);
      grid.appendChild(card);
    });
    drawPortrait(kind);
  }

  var chosenKind = null;
  function renderSpecies() {
    var nav = document.getElementById("species");
    nav.innerHTML = "";
    [null].concat(Sea.kinds()).forEach(function (kind) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (kind === chosenKind ? " active" : "");
      b.textContent = t(kind ? "kind_" + kind : "kind_all");
      b.addEventListener("click", function () { chosenKind = kind; Sea.chooseKind(kind); renderSpecies(); });
      nav.appendChild(b);
    });
  }

  function start() {
    applyStatic();
    fetch(DATA_URL, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      d.whales.forEach(function (w) { byId[w.id] = w; });
      var q = new URLSearchParams(location.search);
      Sea.init(document.getElementById("sea"), d, {
        whale: q.get("whale"), at: q.has("at") ? parseFloat(q.get("at")) : undefined, gallery: q.has("gallery"),
        onTick: onTick,
        tick: function (m) { return t("tick", { n: fmt(m) }); }
      });
      renderSpecies();
      try { if (localStorage.getItem("real") === "1") document.getElementById("real").click(); } catch (e) { /* private mode */ }
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
    // Full screen: the page as a screen-saver. The pills fade after a while and come back on a touch.
    var fullBtn = document.getElementById("full");
    var fs = document.documentElement;
    if (!(fs.requestFullscreen || fs.webkitRequestFullscreen)) fullBtn.hidden = true;
    function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
    fullBtn.addEventListener("click", function () {
      if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { (fs.requestFullscreen || fs.webkitRequestFullscreen).call(fs); }
    });
    function onFullChange() {
      var full = isFull();
      fullBtn.textContent = t(full ? "full_off" : "full_on");
      document.body.classList.toggle("full", full);
      wake();
    }
    document.addEventListener("fullscreenchange", onFullChange);
    document.addEventListener("webkitfullscreenchange", onFullChange);
    var idleTimer = null;
    function wake() {
      document.body.classList.remove("idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { document.body.classList.add("idle"); }, 6000);
    }
    ["pointermove", "pointerdown", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
    wake();

    document.getElementById("real").addEventListener("click", function () {
      var real = !Sea.realTime();
      Sea.setRealTime(real);
      try { localStorage.setItem("real", real ? "1" : "0"); } catch (e) { /* private mode */ }
      document.getElementById("real").textContent = t(real ? "real_on" : "real_off");
      document.getElementById("real").classList.toggle("active", real);
      lastKey = "";
    });
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
})();
