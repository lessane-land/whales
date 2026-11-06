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
    document.getElementById("full").textContent = t((document.fullscreenElement || document.webkitFullscreenElement) ? "full_off" : "full_on");
    lastKey = "";
  }

  function dateText(iso) {
    var d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }

  // The story line: what she is doing right now, from the measured numbers.
  function storyLine(hero, info) {
    var under = Math.round(Sea.underFor(hero) / 60);
    var d = hero.cur, slope = info.slope;   // metres per second, positive going down
    var baleen = hero.kind !== "sperm";
    if (d < 25) {
      var up = Math.round(Sea.surfaceFor(hero) / 60);
      return up >= 1 ? t("phase_surface", { n: up }) : t("phase_surface_short");
    }
    if (slope > 0.25) {
      var rate = fmt(Math.round(slope * 60 / 5) * 5);
      return d > 200 && !baleen ? t("phase_descend_dark", { rate: rate }) : t("phase_descend", { rate: rate, n: under });
    }
    if (slope < -0.25) return t("phase_ascend", { n: under });
    if (baleen) {
      var w = byId[hero.id], dive = w && w.dives.filter(function (dv) { return hero.sec >= dv.t && hero.sec <= dv.t + dv.dur; })[0];
      return dive && dive.lunges ? t("phase_lunge", { d: fmt(Math.round(d / 10) * 10), n: under }) : t("phase_bottom_baleen", { d: fmt(Math.round(d / 10) * 10), n: under });
    }
    return t("phase_bottom", { d: fmt(Math.round(d / 10) * 10), n: under });
  }

  function whoText(hero) {
    var key = hero.kind === "blue" ? "whale_blue" : hero.kind === "fin" ? "whale_fin" : "whale";
    return t(key, { id: hero.id });
  }

  function bioText(w) {
    if (!w) return "";
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
      document.getElementById("deep-sub").textContent = t("clock", { date: ds, time: ts });
    }
  }

  function start() {
    applyStatic();
    fetch(DATA_URL, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      d.whales.forEach(function (w) { byId[w.id] = w; });
      var q = new URLSearchParams(location.search);
      Sea.init(document.getElementById("sea"), d, {
        whale: q.get("whale"), at: q.has("at") ? parseFloat(q.get("at")) : undefined,
        onTick: onTick,
        tick: function (m) { return t("tick", { n: fmt(m) }); }
      });
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

    document.getElementById("sound").addEventListener("click", function () {
      var on = Sound.toggle();
      document.getElementById("sound").textContent = t(on ? "sound_off" : "sound_on");
      document.getElementById("sound").classList.toggle("active", on);
    });
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
