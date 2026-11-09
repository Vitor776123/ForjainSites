/* Entradas guiadas: ao rolar, o robô vai até o título da seção e "puxa" os blocos para dentro da página. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches, root = document.documentElement;
  var SECS = [
    ['#dor', '.eyebrow, h2, .trio article'],
    ['#modelos', '.eyebrow, h2, .lead, .palco, .note'],
    ['#quem', '.about-grid > *'],
    ['#como', '.eyebrow, h2, .steps li'],
    ['#contato', '.contact .wrap > *, .contact > *']
  ];
  var busy = 0;
  function show(els, dir, gap) { els.forEach(function (e, i) { e.style.setProperty('--rvx', dir * 46 + 'px'); setTimeout(function () { e.classList.add('rv-in'); }, RM ? 0 : i * gap); }); }
  var todo = [];
  SECS.forEach(function (c) {
    var sec = document.querySelector(c[0]); if (!sec) return;
    var els = [].slice.call(sec.querySelectorAll(c[1])).filter(function (e, i, a) { return a.indexOf(e) === i && !e.closest('.palco') || e.classList.contains('palco'); });
    if (!els.length) return;
    els.forEach(function (e) { e.classList.add('rv'); });
    todo.push({ sec: sec, els: els });
  });
  if (!todo.length) return;
  root.classList.add('rv-on');
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) return;
      var t = todo.filter(function (k) { return k.sec === x.target; })[0]; if (!t) return;
      io.unobserve(x.target);
      var r = x.target.getBoundingClientRect();
      var vis = t.els.filter(function (e) { return e.getBoundingClientRect().top < innerHeight; });
      var B = window.Buddy, can = B && B.ready() && !RM && !B.perched() && !busy && r.top > -80 && x.target.id !== 'modelos';   // no palco quem guia o robô é o palco.js
      var head = t.els[0], dir = 1;
      if (can) {
        busy = 1; dir = -1;
        B.goTo(head, { pose: 'apontando', secs: 1.6, move: 'jump', lift: -2 });
        setTimeout(function () { show(t.els, 1, 170); }, 650);
        setTimeout(function () { if (B.perched()) B.pose('joinha', 1.4); }, 650 + t.els.length * 170);
        setTimeout(function () { if (B.perched()) B.release(true); busy = 0; }, 1500 + Math.min(t.els.length, 6) * 170);
      } else show(t.els, 1, RM ? 0 : 110);
      t.els.forEach(function (e) { if (e.getBoundingClientRect().bottom < 0) e.classList.add('rv-in'); });
    });
  }, { threshold: .2 });
  todo.forEach(function (k) { io.observe(k.sec); });
  setTimeout(function () { todo.forEach(function (k) { /* rede de segurança: nada fica escondido */ if (!k.els[0].classList.contains('rv-in') && k.sec.getBoundingClientRect().top < innerHeight * .6) k.els.forEach(function (e) { e.classList.add('rv-in'); }); }); }, 5000);

  // brincar quando o visitante para de rolar: o robô sobe nos blocos e faz animações (em "A dor", "Como funciona" e "Contato")
  var PLAY = [['#dor', '.trio article, h2'], ['#como', '.steps li, h2'], ['#contato', '.contact h2, .contact .btn, .contact a.btn, .contact .wrap > *']];
  var lastScroll = performance.now(), playing = false, ptimer = 0, lastEl = null, POSES = ['danca', 'comemorando', 'estrela', 'apontando', 'joinha', 'comemorando'];
  function pickTarget() {
    var H = innerHeight, best = null, area = 0;
    PLAY.forEach(function (c) { var s = document.querySelector(c[0]); if (!s) return; var r = s.getBoundingClientRect(), a = Math.min(r.bottom, H) - Math.max(r.top, 0); if (a > area) { area = a; best = c; } });
    if (!best) return null;
    var els = [].slice.call(document.querySelectorAll(best[0] + ' ' + best[1].split(',').join(', ' + best[0] + ' '))).filter(function (e) {
      var r = e.getBoundingClientRect(); return e !== lastEl && r.width > 40 && r.top > Math.min(210, H * .3) && r.top < H - 90 && r.left > -10 && r.right < innerWidth + 10;
    });
    return els.length ? els[Math.floor(Math.random() * els.length)] : null;
  }
  function playStep() {
    var B = window.Buddy;
    if (!playing || !B || !B.ready() || busy) { playing = false; return; }
    var e = pickTarget();
    if (e) { lastEl = e; var w = e.getBoundingClientRect().width; B.goTo(e, { pose: POSES[Math.floor(Math.random() * POSES.length)], secs: 2.4, dx: (Math.random() - .5) * Math.min(w * .6, 220), lift: -2 }); }
    ptimer = setTimeout(playStep, 3600 + Math.random() * 1800);
  }
  function stopPlay() { if (!playing) return; playing = false; clearTimeout(ptimer); var B = window.Buddy; if (B && B.perched()) B.release(true); }
  window.addEventListener('scroll', function () { lastScroll = performance.now(); stopPlay(); }, { passive: true });
  if (!RM) setInterval(function () {
    var B = window.Buddy;
    if (playing || busy || !B || !B.ready() || B.perched() || performance.now() - lastScroll < 3500) return;
    if (document.getElementById('modal') && !document.getElementById('modal').hidden) return;
    if (pickTarget()) { playing = true; playStep(); }
  }, 1000);
})();
