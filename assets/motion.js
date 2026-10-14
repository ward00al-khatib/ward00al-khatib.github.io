/* motion: everything on the page that moves, apart from the 3D robot.
   With "reduce motion" switched on, only the scroll progress line runs and the content simply sits still. */
(function(){
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  function $(s, el){ return (el || document).querySelector(s); }
  function $$(s, el){ return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ---- scroll progress line ---- */
  var bar = document.createElement("div");
  bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var pTick = false;
  function progress(){
    pTick = false;
    var h = root.scrollHeight - innerHeight;
    bar.style.setProperty("--sp", h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0);
  }
  addEventListener("scroll", function(){ if (!pTick){ pTick = true; requestAnimationFrame(progress); } }, { passive: true });
  addEventListener("resize", progress);
  progress();

  /* ---- marquee: two copies make a seamless loop ---- */
  $$(".marquee-track").forEach(function(t){ t.innerHTML += t.innerHTML; });

  if (reduce) return;
  root.classList.add("motion");

  /* ---- first visit to the home page: a short system check, once per session ---- */
  if (root.classList.contains("boot")){
    var ar = root.getAttribute("data-lang") === "ar";
    var lines = ar ? ["فحص التشغيل الذاتي", "عُقد ROS 2", "YOLOv8 · 4 أصناف", "ذراع 5 درجات حرية · 6× MG996R", "الجنازير · 4 محركات 12 فولت", "جاهز للفرز"]
                   : ["Power-on self test", "ROS 2 nodes", "YOLOv8 · 4 classes", "5-DOF arm · 6× MG996R", "Tracks · 4× 12 V motors", "Ready to sort"];
    var boot = document.createElement("div");
    boot.className = "boot-screen"; boot.setAttribute("aria-hidden", "true");
    boot.innerHTML = '<div class="boot-in"><div class="boot-mark"><span class="boot-eyes"><i></i><i></i></span>WALL·E JUNIOR</div><ol class="boot-log">' +
      lines.map(function(l){ return '<li><span>' + l + '</span><b></b><span class="ok">' + (ar ? "تم" : "OK") + '</span></li>'; }).join("") +
      '</ol><div class="boot-bar"><i></i></div><button class="boot-skip" type="button">' + (ar ? "تخطٍّ" : "Skip") + '</button></div>';
    document.body.appendChild(boot);
    var booted = false;
    var finish = function(){
      if (booted) return; booted = true;
      try { sessionStorage.setItem("wa-boot", "1"); } catch (e) {}
      boot.classList.add("out"); root.classList.remove("boot");
      setTimeout(function(){ boot.remove(); }, 900);
    };
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ boot.querySelector(".boot-bar i").style.width = "100%"; }); });
    $$("li", boot).forEach(function(li, i){ setTimeout(function(){ li.classList.add("on"); }, 140 + i * 200); });
    setTimeout(finish, 1800);
    boot.querySelector(".boot-skip").addEventListener("click", finish);
    addEventListener("keydown", finish, { once: true });
  }

  /* ---- one observer adds "in" when an element scrolls into view ---- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
      if (e.target._onIn) e.target._onIn();
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  function watch(el, onIn){ if (onIn) el._onIn = onIn; io.observe(el); }

  /* ---- headings rise word by word from a mask (words, never letters, so Arabic keeps its joins) ---- */
  function splitWords(el){
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    var counts = [];
    nodes.forEach(function(t){
      if (!t.nodeValue.trim()) return;
      var scope = (t.parentNode.closest && t.parentNode.closest(".en,.ar")) || el;
      var slot = counts.filter(function(c){ return c.s === scope; })[0];
      if (!slot){ slot = { s: scope, k: 0 }; counts.push(slot); }
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function(part){
        if (!part) return;
        if (/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span"), i = document.createElement("i");
        w.className = "sw"; i.textContent = part; i.style.setProperty("--k", slot.k++);
        w.appendChild(i); frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
    el.classList.add("split");
    watch(el);
  }
  $$("h2, .page-title, .sub-h, .cproj h3, .tagline").forEach(splitWords);

  /* ---- the name on the home page: English letters rise one by one, Arabic words as wholes ---- */
  $$(".name .en > span, .name .ar > span").forEach(function(w, wi){
    var txt = w.textContent;
    function done(s){ s.addEventListener("animationend", function(){ s.classList.add("done"); }); }
    if (/^[\x00-\x7F]+$/.test(txt)){
      w.textContent = "";
      var sr = document.createElement("span"), vis = document.createElement("span");
      sr.className = "sr-only"; sr.textContent = txt;
      vis.setAttribute("aria-hidden", "true");
      Array.from(txt).forEach(function(c, ci){
        var s = document.createElement("span");
        s.className = "ch"; s.textContent = c;
        s.style.setProperty("--i", wi * 5 + ci);
        done(s); vis.appendChild(s);
      });
      w.appendChild(sr); w.appendChild(vis);
    } else {
      w.classList.add("ch"); w.style.setProperty("--i", wi * 4); done(w);
    }
  });

  /* ---- blocks fade up as they arrive; siblings follow each other ---- */
  var groups = [".areas > *", ".feats > *", ".comps > *", ".uni > *", ".tracks > *", ".gallery > *", ".results > *",
    ".tally > *", ".pillars > *", ".creds > *", ".cycle > li", ".build > figure", ".alist > li", ".jobs > li", ".parts > li",
    ".specs > div", ".pager > *", ".arch > *", ".c-rows > *", ".specsheet > div", ".studio > *", ".principles > span"];
  groups.forEach(function(sel){
    $$(sel).forEach(function(el){
      var sibs = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.classList.add("rv");
      el.style.setProperty("--d", Math.min(sibs, 7) * 80 + "ms");
      watch(el);
    });
  });
  $$(".sec-intro, .page-lead, .hero .lead, .cta, .proj-intro, .proj-main, .role, .classes, .testmix, .gold-pic, .wro-media, " +
     ".profile-text, .rose-head, .rose-text, .quote, .cycle-note, .tb, .chips, .sub-intro, .note, .cproj-text, .cproj-fig, " +
     ".bom-wrap, .mtable-wrap, .stage-foot, .wro > div:first-child, .gold > div:not(.gold-pic), .eyebrow, .crumb").forEach(function(el){
    if (el.classList.contains("rv")) return;
    el.classList.add("rv"); watch(el);
  });

  /* ---- numbers count up: 19/20, ~300, 10/12 ... (years and words stay as they are) ---- */
  function countUp(el){
    if (el.children.length) return;
    var m = el.textContent.match(/^(\D*?)(\d[\d,]*)([\s\S]*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ""), 10), comma = m[2].indexOf(",") > -1;
    if (!target || (target >= 1900 && target <= 2100)) return;
    var fmt = function(n){ var s = String(n); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s; };
    el.textContent = m[1] + fmt(0) + m[3];
    watch(el, function(){
      var t0 = performance.now(), dur = 1400 + Math.min(target, 400) * 2;
      (function tick(now){
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = m[1] + fmt(Math.round(target * e)) + m[3];
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }
  $$(".specs b, .tcount b, .k-value").forEach(countUp);

  /* ---- meters fill and the 20 test items pop in ---- */
  $$(".meter").forEach(function(m){ watch(m); });
  $$(".units").forEach(function(u){
    $$(".uboxes i", u).forEach(function(i, k){ i.style.setProperty("--k", k); });
    watch(u);
  });

  /* ---- the eyebrow on the home page types through roles ---- */
  $$(".typer").forEach(function(t){
    var words = (t.getAttribute("data-words") || "").split("|").filter(Boolean);
    if (!words.length) return;
    var sr = document.createElement("span");
    sr.className = "sr-only"; sr.textContent = t.textContent;
    t.parentNode.insertBefore(sr, t);
    t.setAttribute("aria-hidden", "true");
    var wi = 0, ci = Array.from(words[0]).length, del = false;
    t.textContent = words[0];
    setTimeout(function step(){
      if (!t.offsetParent){ setTimeout(step, 600); return; }
      var chars = Array.from(words[wi]);
      if (!del){
        ci++;
        t.textContent = chars.slice(0, ci).join("");
        if (ci >= chars.length){ del = true; setTimeout(step, 1900); return; }
        setTimeout(step, 55 + Math.random() * 45);
      } else {
        ci--;
        t.textContent = chars.slice(0, Math.max(ci, 0)).join("");
        if (ci <= 0){ del = false; wi = (wi + 1) % words.length; setTimeout(step, 300); return; }
        setTimeout(step, 28);
      }
    }, 2200);
  });

  /* ---- graduation: the state machine runs, one state after another ---- */
  var cycle = $(".cycle");
  if (cycle){
    var states = $$(".cycle > li"), si = 0, timer = 0;
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (e.isIntersecting && !timer){
          timer = setInterval(function(){
            states.forEach(function(li, i){ li.classList.toggle("on", i === si); });
            si = (si + 1) % states.length;
          }, 950);
        } else if (!e.isIntersecting && timer){ clearInterval(timer); timer = 0; }
      });
    }).observe(cycle);
  }

  /* ---- circuit field behind the hero and the page heads: dots light up near the cursor,
         signals run along the grid lines and turn at junctions ---- */
  function circuit(host){
    var c = document.createElement("canvas");
    c.className = "fxbg"; c.setAttribute("aria-hidden", "true");
    host.insertBefore(c, host.firstChild);
    var ctx = c.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, gap = 32, cols = 0, rows = 0, mx = -1e4, my = -1e4, pulses = [], on = false, seen = true;
    var DIRS = [[1,0],[0,1],[-1,0],[0,-1]];
    function size(){
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / gap) + 1; rows = Math.ceil(H / gap) + 1;
      var want = Math.max(4, Math.min(12, Math.round(W * H / 70000)));
      while (pulses.length < want) pulses.push(pulse());
      pulses.length = want;
    }
    function pulse(){
      return { x: Math.floor(Math.random() * cols) * gap, y: Math.floor(Math.random() * rows) * gap,
        dir: Math.floor(Math.random() * 4), t: 0, v: 0.9 + Math.random() * 1.6, trail: [],
        rgb: Math.random() < 0.65 ? "61,220,255" : "255,138,31", ttl: 240 + Math.random() * 360 };
    }
    function frame(){
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(150,172,214,.13)";
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) ctx.fillRect(i * gap - 0.7, j * gap - 0.7, 1.4, 1.4);
      var R = 180;
      if (mx > -R && my > -R && mx < W + R && my < H + R){
        var i0 = Math.max(0, Math.floor((mx - R) / gap)), i1 = Math.min(cols, Math.ceil((mx + R) / gap));
        var j0 = Math.max(0, Math.floor((my - R) / gap)), j1 = Math.min(rows, Math.ceil((my + R) / gap));
        for (i = i0; i < i1; i++) for (j = j0; j < j1; j++){
          var x = i * gap, y = j * gap, d = Math.hypot(x - mx, y - my);
          if (d > R) continue;
          var k = 1 - d / R, s = 1.4 + k * 3;
          ctx.fillStyle = "rgba(255," + Math.round(138 + 70 * k) + "," + Math.round(31 + 90 * k) + "," + (0.15 + k * 0.75).toFixed(3) + ")";
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      ctx.lineWidth = 1.5; ctx.lineCap = "round";
      pulses.forEach(function(p, n){
        var d = DIRS[p.dir];
        p.t += p.v;
        if (p.t >= gap){
          p.x += d[0] * gap; p.y += d[1] * gap; p.t -= gap;
          if (Math.random() < 0.33) p.dir = (p.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
          d = DIRS[p.dir];
        }
        var hx = p.x + d[0] * p.t, hy = p.y + d[1] * p.t;
        p.trail.push([hx, hy]); if (p.trail.length > 26) p.trail.shift();
        for (var q = 1; q < p.trail.length; q++){
          ctx.strokeStyle = "rgba(" + p.rgb + "," + (q / p.trail.length * 0.8).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(p.trail[q - 1][0], p.trail[q - 1][1]); ctx.lineTo(p.trail[q][0], p.trail[q][1]); ctx.stroke();
        }
        ctx.fillStyle = "rgba(" + p.rgb + ",.95)";
        ctx.beginPath(); ctx.arc(hx, hy, 2, 0, 6.2832); ctx.fill();
        if (--p.ttl < 0 || hx < -gap || hy < -gap || hx > W + gap || hy > H + gap) pulses[n] = pulse();
      });
      requestAnimationFrame(frame);
    }
    function sync(){ var run = seen && !document.hidden; if (run && !on){ on = true; requestAnimationFrame(frame); } else if (!run) on = false; }
    host.addEventListener("pointermove", function(e){ var r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener("pointerleave", function(){ mx = my = -1e4; });
    new IntersectionObserver(function(es){ seen = es[0].isIntersecting; sync(); }).observe(host);
    document.addEventListener("visibilitychange", sync);
    if (window.ResizeObserver) new ResizeObserver(size).observe(host); else addEventListener("resize", size);
    size(); sync();
  }
  $$(".hero, .page-head").forEach(circuit);

  /* ---- hero parallax: the name drifts up, the outline word slides ---- */
  var head = $(".hero-head"), hero = $(".hero");
  if (head && hero){
    var hTick = false;
    addEventListener("scroll", function(){
      if (hTick) return; hTick = true;
      requestAnimationFrame(function(){
        hTick = false;
        var y = Math.min(scrollY, hero.offsetHeight);
        head.style.translate = "0 " + (y * -0.12).toFixed(1) + "px";
      });
    }, { passive: true });
  }

  if (!fine) return;

  /* ---- cards lean toward the pointer, with a spotlight under it ---- */
  $$(".area, .comp, .uni-card, .tcard, .pg, .tcount, .feat").forEach(function(el){
    el.classList.add("fx");
    var s = document.createElement("span");
    s.className = "spot"; s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
    el.addEventListener("pointermove", function(e){
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      el.style.setProperty("--ry", ((x - 0.5) * 7).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((0.5 - y) * 7).toFixed(2) + "deg");
    });
    el.addEventListener("pointerleave", function(){ el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  });

  /* ---- magnetic buttons ---- */
  $$(".btn, .call, .wave-btn").forEach(function(b){
    b.addEventListener("pointermove", function(e){
      var r = b.getBoundingClientRect();
      b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + "px";
    });
    b.addEventListener("pointerleave", function(){ b.style.translate = ""; });
  });

  /* ---- a soft lamp follows the cursor ---- */
  var lamp = document.createElement("div");
  lamp.className = "glow-cursor"; lamp.setAttribute("aria-hidden", "true");
  document.body.appendChild(lamp);
  var tx = -999, ty = -999, cx = tx, cy = ty, raf = 0;
  function follow(){
    cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
    lamp.style.translate = cx.toFixed(1) + "px " + cy.toFixed(1) + "px";
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(follow) : 0;
  }
  addEventListener("pointermove", function(e){
    if (cx < -900){ cx = e.clientX; cy = e.clientY; }
    tx = e.clientX; ty = e.clientY;
    if (!raf) raf = requestAnimationFrame(follow);
  }, { passive: true });
})();
