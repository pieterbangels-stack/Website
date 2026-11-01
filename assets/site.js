// Progressive enhancement only: all content is in the HTML for search engines and LLMs.
(function () {
  document.documentElement.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Orbs follow the cursor a little (TVC cover circles)
  var orbs = document.querySelectorAll(".hero .orb");
  if (orbs.length && !reduce && window.matchMedia("(pointer: fine)").matches) {
    var depth = [18, -28, 40];
    window.addEventListener("pointermove", function (e) {
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      orbs.forEach(function (o, i) { o.style.transform = "translate(" + (x * depth[i]).toFixed(1) + "px," + (y * depth[i]).toFixed(1) + "px)"; });
    }, { passive: true });
  }

  // Count-up for the facts (final value is already in the HTML)
  if (!reduce && "IntersectionObserver" in window) {
    var counters = document.querySelectorAll("[data-count]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = +el.dataset.count, t0 = null;
        function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  // Meter-to-cash chain: tabs with keyboard support and an auto-advancing flow until the visitor interacts
  var chain = document.querySelector("[data-chain]");
  if (chain) {
    var tabs = Array.prototype.slice.call(chain.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(chain.querySelectorAll('[role="tabpanel"]'));
    var flow = chain.querySelector(".chain-flow");
    var auto = null, current = 0;
    function select(i, focus) {
      current = i;
      tabs.forEach(function (t, j) {
        t.setAttribute("aria-selected", j === i ? "true" : "false");
        t.tabIndex = j === i ? 0 : -1;
        t.classList.toggle("done", j < i);
      });
      panels.forEach(function (p, j) { if (j === i) p.removeAttribute("data-hidden"); else p.setAttribute("data-hidden", "true"); });
      if (flow) flow.style.width = (i / (tabs.length - 1)) * 100 + "%";
      if (focus) tabs[i].focus();
    }
    function stop() { if (auto) { clearInterval(auto); auto = null; } }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { stop(); select(i); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = tabs.length;
        if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); stop(); select((i + 1) % n, true); }
        if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); stop(); select((i - 1 + n) % n, true); }
        if (k === "Home") { e.preventDefault(); stop(); select(0, true); }
        if (k === "End") { e.preventDefault(); stop(); select(n - 1, true); }
      });
    });
    chain.addEventListener("pointerenter", stop);
    chain.addEventListener("focusin", stop);
    select(0);
    if (!reduce && "IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { seen.disconnect(); auto = setInterval(function () { select((current + 1) % tabs.length); }, 3200); }
      }, { threshold: 0.5 });
      seen.observe(chain);
    }
  }

  // Client logo marquee: duplicate the list once for a seamless loop
  document.querySelectorAll("[data-marquee]").forEach(function (m) {
    var list = m.querySelector(".logos");
    if (!list || reduce) return;
    Array.prototype.slice.call(list.children).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); list.appendChild(c); });
    m.classList.add("run");
  });

  // Blog topic filter
  var filters = document.querySelectorAll("[data-filter]");
  filters.forEach(function (b) {
    b.addEventListener("click", function () {
      var tag = b.dataset.filter;
      filters.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      document.querySelectorAll(".post-card").forEach(function (c) { c.hidden = tag && c.dataset.tags.split("|").indexOf(tag) === -1; });
    });
  });

  // Reading progress on articles
  var bar = document.querySelector(".progress span");
  if (bar) {
    var upd = function () { var h = document.documentElement; var p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); bar.style.transform = "scaleX(" + Math.min(1, p) + ")"; };
    window.addEventListener("scroll", upd, { passive: true }); upd();
  }

  // Copy email
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var label = b.textContent;
      try {
        navigator.clipboard.writeText(b.dataset.copy).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = label; }, 1800); }, function () { b.textContent = b.dataset.copy; });
      } catch (e) { b.textContent = b.dataset.copy; }
    });
  });
})();

// Latest-articles carousel (cards stay in the HTML; this only adds navigation)
(function () {
  document.querySelectorAll("[data-carousel]").forEach(function (c) {
    var track = c.querySelector(".car-track");
    var cards = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(c.querySelectorAll(".car-dots span"));
    var prev = c.querySelector('[data-dir="-1"]'), next = c.querySelector('[data-dir="1"]');
    function index() {
      var left = track.scrollLeft, best = 0, d = Infinity;
      cards.forEach(function (card, i) { var x = Math.abs(card.offsetLeft - track.offsetLeft - left); if (x < d) { d = x; best = i; } });
      return best;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2, i = track.scrollLeft >= max ? cards.length - 1 : index();
      dots.forEach(function (dot, j) { dot.classList.toggle("on", j === i); });
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    }
    function go(dir) {
      var i = Math.max(0, Math.min(cards.length - 1, index() + dir));
      track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
