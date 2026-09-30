// KAGT tile field: a puzzle board for page headers and banners.
// A grid of navy pieces with a few gaps. Every couple of seconds a piece next to a gap slides into it
// and lights teal as it lands, then dims. Pieces under the mouse brighten a little. On "kagt:solve"
// (typing K, A, G, T) a wave of light crosses the board.
// Under reduced motion the board is still. It pauses when off screen or in a background tab.
//
//   <header class="kagt-field-host"> ... <div data-kagt-keepout>logo and heading</div> ... </header>
//   KagtTileField.mount(document.querySelector(".kagt-field-host"));
//
// Pieces are not drawn under elements marked data-kagt-keepout, so the board makes room for the content.
(function () {
  var NS = "http://www.w3.org/2000/svg";

  function mount(host, options) {
    var o = Object.assign({
      pitch: 36,         // px from one piece to the next
      size: 28,          // px, piece width
      gaps: 0.07,        // share of cells left empty
      lit: 0.03,         // share of pieces lit at rest
      every: 1800,       // ms between moves
      piece: "#1B2750",
      glow: "#2A3868",
      litColour: "#00BFA5",
      moveColours: null, // optional: [["#colour", weight], ...] for pieces that move or light up; the resting lit ones keep litColour
      seed: 2718         // change for a different board
    }, options || {});
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "kagt-field");
    host.prepend(svg);

    var cells = [], cols = 0, rows = 0, timer = null, onScreen = true, hoverCell = null;

    function blocked(x, y) {
      var hostBox = host.getBoundingClientRect();
      var pad = o.pitch / 2;
      return Array.prototype.some.call(host.querySelectorAll("[data-kagt-keepout]"), function (el) {
        var b = el.getBoundingClientRect();
        var l = b.left - hostBox.left - pad, t = b.top - hostBox.top - pad;
        var r = b.right - hostBox.left + pad, btm = b.bottom - hostBox.top + pad;
        return x + o.size > l && x < r && y + o.size > t && y < btm;
      });
    }

    function colourOf(cell) { return cell.lit ? o.litColour : o.piece; }

    // The colour a piece flashes when it moves or lights up: picked by weight from moveColours, else litColour.
    function flashColour() {
      if (!o.moveColours || !o.moveColours.length) return o.litColour;
      var total = o.moveColours.reduce(function (t, c) { return t + c[1]; }, 0), r = Math.random() * total;
      for (var i = 0; i < o.moveColours.length; i++) { r -= o.moveColours[i][1]; if (r < 0) return o.moveColours[i][0]; }
      return o.moveColours[0][0];
    }

    // The same number for the same cell every time, so laying the board out again (after a resize
    // or when fonts load) only makes room for content and never reshuffles the pieces.
    function chance(c, r, k) {
      var h = (Math.imul(c + 1, 73856093) ^ Math.imul(r + 1, 19349663) ^ Math.imul(k, 83492791) ^ o.seed) >>> 0;
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    function build() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      cells = [];
      var w = host.clientWidth, h = host.clientHeight;
      cols = Math.ceil(w / o.pitch); rows = Math.ceil(h / o.pitch);
      var off = (o.pitch - o.size) / 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * o.pitch + off, y = r * o.pitch + off;
          var cell = { c: c, r: r, x: x, y: y, el: null, lit: false, fixed: blocked(x, y) };
          if (!cell.fixed && chance(c, r, 1) >= o.gaps) {
            cell.lit = chance(c, r, 2) < o.lit;
            cell.el = document.createElementNS(NS, "rect");
            cell.el.setAttribute("x", x); cell.el.setAttribute("y", y);
            cell.el.setAttribute("width", o.size); cell.el.setAttribute("height", o.size);
            cell.el.setAttribute("rx", o.size / 4);
            cell.el.setAttribute("fill", colourOf(cell));
            svg.appendChild(cell.el);
          }
          cells.push(cell);
        }
      }
    }

    function at(c, r) { return c < 0 || r < 0 || c >= cols || r >= rows ? null : cells[r * cols + c]; }

    function move() {
      var gaps = cells.filter(function (g) { return !g.el && !g.fixed; });
      if (!gaps.length) return;
      var gap = gaps[Math.floor(Math.random() * gaps.length)];
      var near = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(function (d) { return at(gap.c + d[0], gap.r + d[1]); })
        .filter(function (n) { return n && n.el; });
      if (!near.length) return;
      var from = near[Math.floor(Math.random() * near.length)];
      var el = from.el;
      // Move the piece to the gap, then animate it from where it was (so it slides in).
      el.setAttribute("x", gap.x); el.setAttribute("y", gap.y);
      gap.el = el; from.el = null;
      gap.lit = false; from.lit = false;
      // Light it at once (skip the fill fade), then let it dim slowly after landing.
      el.style.transition = "none";
      el.setAttribute("fill", flashColour());
      el.getBoundingClientRect();
      el.style.transition = "";
      el.animate([{ transform: "translate(" + (from.x - gap.x) + "px," + (from.y - gap.y) + "px)" }, { transform: "none" }],
        { duration: 360, easing: "cubic-bezier(.34, 1.4, .64, 1)" });
      setTimeout(function () { if (gap.el === el) el.setAttribute("fill", o.piece); }, 900);
    }

    function wave() {
      if (reduce.matches) return;
      cells.forEach(function (cell) {
        if (!cell.el) return;
        var el = cell.el;
        setTimeout(function () {
          el.setAttribute("fill", flashColour());
          setTimeout(function () { el.setAttribute("fill", colourOf(cell)); }, 260);
        }, (cell.c + cell.r) * 28);
      });
    }

    function onPointer(e) {
      if (reduce.matches || e.pointerType !== "mouse") return;
      var b = svg.getBoundingClientRect();
      var cell = at(Math.floor((e.clientX - b.left) / o.pitch), Math.floor((e.clientY - b.top) / o.pitch));
      if (!cell || cell === hoverCell || !cell.el || cell.lit) return;
      hoverCell = cell;
      var el = cell.el;
      el.setAttribute("fill", o.glow);
      setTimeout(function () { if (cell.el === el && !cell.lit) el.setAttribute("fill", o.piece); }, 500);
    }

    function run() {
      clearInterval(timer); timer = null;
      if (!reduce.matches && onScreen && !document.hidden) timer = setInterval(move, o.every);
    }

    build();
    run();
    host.addEventListener("pointermove", onPointer);
    document.addEventListener("kagt:solve", wave);
    document.addEventListener("visibilitychange", run);
    if (reduce.addEventListener) reduce.addEventListener("change", run);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; run(); }).observe(host);
    }
    // Lay the board out again when the host or the content it makes room for changes size
    // (web fonts arriving make headings grow after the first layout).
    var pending = null, sizes = "";
    function measure() {
      return [host].concat(Array.prototype.slice.call(host.querySelectorAll("[data-kagt-keepout]")))
        .map(function (el) { var b = el.getBoundingClientRect(); return Math.round(b.width) + "x" + Math.round(b.height); }).join();
    }
    function rebuildIfMoved() {
      var now = measure();
      if (now === sizes) return;
      sizes = now; clearTimeout(pending); pending = setTimeout(build, 120);
    }
    sizes = measure();
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(rebuildIfMoved);
      ro.observe(host);
      host.querySelectorAll("[data-kagt-keepout]").forEach(function (el) { ro.observe(el); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuildIfMoved);
    return { wave: wave, rebuild: build };
  }

  window.KagtTileField = { mount: mount };
})();
