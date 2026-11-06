(function () {
  "use strict";

  var DATA_URL = "data/whales.json";
  var lang = pickLang();
  var data = null;

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
  }

  function whenText(w) {
    if (!w.tagged) return "";
    var d = new Date(w.tagged + "T12:00:00Z");
    return new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }

  var lastShown = null, lastDepth = -1;
  function onTick(deepest) {
    if (!deepest) return;
    var d = Math.round(deepest.cur / 5) * 5;
    if (deepest === lastShown && d === lastDepth) return;
    lastShown = deepest;
    lastDepth = d;
    var w = data.whales.filter(function (x) { return x.id === deepest.id; })[0];
    document.getElementById("deep-depth").textContent = t("depth_m", { n: fmt(d) });
    var under = Sea.underFor(deepest);
    document.getElementById("deep-who").textContent = t("whale", { id: deepest.id }) + " · " +
      (under > 60 ? t("under", { n: Math.round(under / 60) }) : t("at_surface"));
    document.getElementById("deep-sub").textContent = t("where_when", { when: whenText(w) }) + " · " + t("speed", { x: Sea.speed });
  }

  function start() {
    applyStatic();
    fetch(DATA_URL, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      Sea.init(document.getElementById("sea"), d, {
        onTick: onTick,
        tick: function (m) { return t("tick", { n: fmt(m) }); },
        label: function (depth, w) { return w.id + " · " + t("depth_m", { n: fmt(Math.round(depth)) }); }
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) Sea.pause(); else Sea.resume();
      });
    });

    document.getElementById("lang").addEventListener("click", function () {
      lang = lang === "es" ? "en" : "es";
      try { localStorage.setItem("lang", lang); } catch (e) { /* private mode */ }
      lastDepth = -1;
      applyStatic();
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
