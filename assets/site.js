/* shared page behaviour: language, menu, experience track, gallery, lightbox, copy.
   Every part checks that its elements exist, so each page only carries what it uses. */
(function(){
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s){ return document.querySelector(s); }
  function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ---- language ---- */
  var imgs = $$("img[data-ar-alt]");
  imgs.forEach(function(im){ im.setAttribute("data-en-alt", im.alt); });
  function applyAlts(l){ imgs.forEach(function(im){ im.alt = im.getAttribute(l === "ar" ? "data-ar-alt" : "data-en-alt"); }); }
  function setLang(l){
    root.setAttribute("data-lang", l); root.lang = l; root.dir = l === "ar" ? "rtl" : "ltr";
    applyAlts(l);
    try { localStorage.setItem("wa-lang", l); } catch (e) {}
    requestAnimationFrame(updateTrack);
    window.dispatchEvent(new Event("wa-layout"));
  }
  applyAlts(root.getAttribute("data-lang"));
  var langBtn = $("#lang-toggle");
  if (langBtn) langBtn.addEventListener("click", function(){ setLang(root.getAttribute("data-lang") === "ar" ? "en" : "ar"); });

  /* ---- phone menu closes after a pick ---- */
  var menu = $(".menu");
  if (menu) $$(".menu a").forEach(function(a){ a.addEventListener("click", function(){ menu.open = false; }); });

  /* ---- top-view WALL-E Junior driving down an experience track ---- */
  var track = $("#track"), bot = $("#bot");
  var cps = $$(".cp");
  var ticking = false;
  function updateTrack(){
    ticking = false;
    if (!track || !bot) return;
    var r = track.getBoundingClientRect(), h = r.height;
    if (reduce){ track.style.setProperty("--p", 1); cps.forEach(function(c){ c.classList.add("on"); }); return; }
    var target = window.innerHeight * 0.45;
    var y = Math.max(0, Math.min(h, target - r.top));
    bot.style.setProperty("--y", y.toFixed(1) + "px");
    bot.style.setProperty("--r", (Math.sin(y / 38) * 4).toFixed(2) + "deg");
    track.style.setProperty("--p", h ? (y / h).toFixed(4) : 0);
    cps.forEach(function(c){ c.classList.toggle("on", c.getBoundingClientRect().top + 9 <= r.top + y + 4); });
  }
  if (track){
    var onScroll = function(){ if (!ticking){ ticking = true; requestAnimationFrame(updateTrack); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateTrack();
  }

  /* ---- gallery filter (only where filter buttons exist) ---- */
  var shots = $$(".shot");
  var fbtns = $$(".filters button");
  fbtns.forEach(function(b){
    b.addEventListener("click", function(){
      var f = b.getAttribute("data-f");
      fbtns.forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      shots.forEach(function(s){ s.hidden = !(f === "all" || s.getAttribute("data-cat") === f); });
    });
  });

  /* ---- lightbox ---- */
  var lb = $("#lb");
  if (lb && shots.length){
    var lbImg = $("#lb-img"), lbCap = $("#lb-cap"), cur = 0;
    var visible = function(){ return shots.filter(function(s){ return !s.hidden; }); };
    var show = function(i){
      var v = visible(); if (!v.length) return;
      cur = (i + v.length) % v.length;
      var im = v[cur].querySelector("img");
      lbImg.src = im.src; lbImg.alt = im.alt;
      lbCap.innerHTML = v[cur].querySelector("figcaption > span").innerHTML;
    };
    shots.forEach(function(s){
      s.querySelector("button").addEventListener("click", function(){
        show(visible().indexOf(s));
        if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
      });
    });
    $("#lb-prev").addEventListener("click", function(){ show(cur + (root.dir === "rtl" ? 1 : -1)); });
    $("#lb-next").addEventListener("click", function(){ show(cur + (root.dir === "rtl" ? -1 : 1)); });
    $("#lb-close").addEventListener("click", function(){ lb.close(); });
    lb.addEventListener("click", function(e){ if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", function(e){
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
  }

  /* ---- copy phone ---- */
  var copyBtn = $("#copy-phone"), phone = $("#phone");
  if (copyBtn && phone) copyBtn.addEventListener("click", function(){
    var done = function(){
      var old = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="en">Copied</span><span class="ar">تم النسخ</span>';
      setTimeout(function(){ copyBtn.innerHTML = old; }, 1600);
    };
    var fallback = function(){ var s = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(phone); s.removeAllRanges(); s.addRange(rg); };
    try { navigator.clipboard.writeText("+963991050138").then(done, fallback); } catch (e) { fallback(); }
  });
})();
