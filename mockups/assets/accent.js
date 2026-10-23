/* Applies the user's accent color (stored in localStorage) to a mockup, and powers the color picker. */
(function () {
  var KEY = "hoops-accent";
  function parse(h) { var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || "").trim()); if (!m) return null; var x = m[1]; if (x.length === 3) x = x.split("").map(function (c) { return c + c; }).join(""); return "#" + x.toLowerCase(); }
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function lum(c) { var f = function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }
  function contrast(a, b) { var x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function hex(c) { return "#" + c.map(function (v) { return Math.round(v).toString(16).padStart(2, "0"); }).join(""); }
  function vars(h) {
    var a = parse(h) || "#0c8312";
    var ink = contrast(a, "#ffffff") >= contrast(a, "#111418") ? "#ffffff" : "#111418";
    var c = rgb(a), n = 0; while (contrast(hex(c), "#ffffff") < 4.5 && n++ < 40) c = c.map(function (v) { return v * .92; });
    return { a: a, ink: ink, text: hex(c) };
  }
  function apply(doc, h) { var v = vars(h), s = doc.documentElement.style; s.setProperty("--accent", v.a); s.setProperty("--accent-ink", v.ink); s.setProperty("--accent-text", v.text); mark(doc, v.a); }
  function mark(doc, a) { doc.querySelectorAll("[data-hex]").forEach(function (el) { el.classList.toggle("on", el.getAttribute("data-hex").toLowerCase() === a); }); var p = doc.querySelector("input[type=color]"); if (p) p.value = a; }
  function get() { try { return localStorage.getItem(KEY); } catch { return null; } }
  function set(h) {
    h = parse(h); if (!h) return;
    try { localStorage.setItem(KEY, h); } catch {}
    apply(document, h);
    document.querySelectorAll("iframe").forEach(function (f) { try { apply(f.contentDocument, h); } catch {} });
    try { if (window.parent !== window && window.parent.HL) window.parent.HL.set(h); } catch {}
  }
  window.HL = { set: set, get: get, apply: apply };
  var saved = get(); apply(document, saved || "#0c8312");
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-hex]"); if (t) { e.preventDefault(); set(t.getAttribute("data-hex")); } });
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("input[type=color]")) set(e.target.value); });
})();
