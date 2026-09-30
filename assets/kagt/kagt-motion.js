// KAGT mark behaviour, for pages that inline the mark, badge or lockup and load kagt-mark-motion.css.
// - Intro: a mark with class "is-intro" plays once per visit (see the head snippet in the README).
// - Reseat: hovering or keyboard-focusing a link with class "kagt-link" lifts the T out and clicks it back in.
// - Loading: add class "is-loading" to a mark yourself; call KagtMark.loaded(mark) when the wait is over.
// - Solve: typing K, A, G, T anywhere outside a text field, or tapping a logo four times quickly, scrambles
//   and re-solves every mark on the page, and fires a "kagt:solve" event on document (the tile field
//   answers with a wave). Call KagtMark.solve() yourself when something is finished, for example when the
//   contact form has sent. Keep it for real completions, so it stays special.
// - Dividers (.kagt-divider): the last piece slides in when the divider scrolls into view.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var BUSY = ["is-intro", "is-reseat", "is-fit", "is-solve", "is-loading"];
  var LAP = 1400; // one loader lap: four moves of 350 ms

  function busy(mark) {
    return BUSY.some(function (c) { return mark.classList.contains(c); });
  }

  function play(mark, cls) {
    if (reduce.matches || busy(mark)) return;
    mark.classList.add(cls);
  }

  // Each behaviour ends on a known animation; clear its class then, so the next one can start.
  var ENDS = {
    "kagt-switch-on": ["is-intro", "is-fit"],
    "kagt-reseat": ["is-reseat"],
    "kagt-solve-t": ["is-solve"]
  };

  function wire(mark) {
    mark.addEventListener("animationend", function (e) {
      (ENDS[e.animationName] || []).forEach(function (c) { mark.classList.remove(c); });
    });
    // The intro was skipped (already seen this visit, or reduced motion), so no animationend will come.
    if (mark.classList.contains("is-intro") &&
        (reduce.matches || document.documentElement.classList.contains("kagt-intro-seen"))) {
      mark.classList.remove("is-intro");
    }
  }

  function loaded(mark) {
    if (!mark.classList.contains("is-loading")) return;
    var piece = mark.querySelector(".kagt-tile--k .kagt-tile__bg");
    var anim = piece && piece.getAnimations ? piece.getAnimations()[0] : null;
    if (reduce.matches || !anim || anim.currentTime == null) {
      mark.classList.remove("is-loading");
      return;
    }
    // Finish at the end of a lap, when the gap is back in the T's slot, so the T can slide home.
    var wait = LAP - (anim.currentTime % LAP);
    setTimeout(function () {
      mark.classList.remove("is-loading");
      mark.classList.add("is-fit");
    }, wait);
  }

  function solveAll() {
    document.querySelectorAll(".kagt-mark").forEach(function (m) { play(m, "is-solve"); });
    document.dispatchEvent(new CustomEvent("kagt:solve"));
  }

  function listenForKagt() {
    var typed = "";
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (!e.key || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-4);
      if (typed === "kagt") { typed = ""; solveAll(); }
    });
  }

  // Four quick taps on a logo solve it too, for phones and tablets, where nobody types.
  // A logo link that goes to another page still just goes there. A logo link to the page you are
  // on counts taps instead of reloading, and its first tap scrolls back to the top.
  function listenForTaps() {
    var count = 0, last = 0, GAP = 450;
    document.addEventListener("click", function (e) {
      var hit = e.target && e.target.closest ? e.target.closest(".kagt-mark, .kagt-link") : null;
      if (!hit) return;
      var link = hit.closest("a[href]");
      if (link) {
        var url = new URL(link.getAttribute("href"), location.href);
        var here = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !url.hash;
        if (!here) return;
        e.preventDefault();
      }
      var now = Date.now();
      count = now - last < GAP ? count + 1 : 1;
      last = now;
      if (count === 1 && link) window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
      if (count === 4) { count = 0; solveAll(); }
    });
  }

  function dividers() {
    var list = document.querySelectorAll(".kagt-divider");
    if (!list.length || reduce.matches || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove("is-waiting");
        io.unobserve(en.target);
      });
    }, { threshold: 1 });
    list.forEach(function (d) {
      // Only pieces below the fold wait; one already on screen stays in place.
      if (d.getBoundingClientRect().top > window.innerHeight) {
        d.classList.add("is-waiting");
        io.observe(d);
      }
    });
  }

  function init() {
    document.querySelectorAll(".kagt-mark").forEach(wire);
    document.querySelectorAll(".kagt-link").forEach(function (link) {
      var mark = link.querySelector(".kagt-mark");
      if (!mark) return;
      link.addEventListener("pointerenter", function () { play(mark, "is-reseat"); });
      link.addEventListener("focus", function () { if (link.matches(":focus-visible")) play(mark, "is-reseat"); });
    });
    listenForKagt();
    listenForTaps();
    dividers();
    try { sessionStorage.setItem("kagt-intro", "1"); } catch (e) { /* storage blocked: the intro may replay */ }
  }

  window.KagtMark = { loaded: loaded, solve: solveAll, play: play, wire: wire };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
