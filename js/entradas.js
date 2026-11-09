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
        B.goTo(head, { pose: 'joinha', secs: 1.6, move: 'jump', lift: -2 });
        setTimeout(function () { show(t.els, 1, 170); }, 650);
        setTimeout(function () { if (B.perched()) B.pose('joinha', 1.4); }, 650 + t.els.length * 170);
        setTimeout(function () { if (B.perched()) B.release(true); busy = 0; }, 1500 + Math.min(t.els.length, 6) * 170);
      } else show(t.els, 1, RM ? 0 : 110);
      t.els.forEach(function (e) { if (e.getBoundingClientRect().bottom < 0) e.classList.add('rv-in'); });
    });
  }, { threshold: .2 });
  todo.forEach(function (k) { io.observe(k.sec); });
  setTimeout(function () { todo.forEach(function (k) { /* rede de segurança: nada fica escondido */ if (!k.els[0].classList.contains('rv-in') && k.sec.getBoundingClientRect().top < innerHeight * .6) k.els.forEach(function (e) { e.classList.add('rv-in'); }); }); }, 5000);

  // brincar quando o visitante para de rolar (2 s; no palco, 5 s): sobe nos blocos, pula, voa, teleporta, escala as bordas
  var PLAY = '#dor h2, #dor .trio article, #modelos .eyebrow, #modelos h2, .pl-chip, .pl-screen, .pl-pk, .pl-open, #quem h2, #quem .photo, #quem .about-grid > div > *, #como h2, #como .steps li, #contato h2, #contato .btn';
  var lastAct = performance.now(), playing = false, ptimer = 0, lastEl = null, POSES = ['danca', 'comemorando', 'estrela', 'joinha', 'pensativo', 'comemorando', 'espiando'];
  function onPalco() { var B = window.Buddy, e = B && B.el && B.el(); return !!(e && e.closest && e.closest('.palco')); }
  function pickTarget(maxFrac) {
    var H = innerHeight, head = Math.min(210, H * .28);
    var els = [].slice.call(document.querySelectorAll(PLAY)).filter(function (e) {
      var r = e.getBoundingClientRect(); return e !== lastEl && r.width > 40 && r.height > 16 && r.top > head && r.top < H * (maxFrac || 1) - 90 * (maxFrac ? 0 : 1) && r.left > -10 && r.right < innerWidth + 10;
    });
    return els.length ? els[Math.floor(Math.random() * els.length)] : null;
  }
  var tms = [], lastAct2 = '', ACTS = ['perch', 'tramp', 'slide', 'hang', 'drop', 'flip', 'roam', 'peek', 'tramp', 'slide'];
  function later(fn, ms) { tms.push(setTimeout(function () { if (playing) fn(); }, ms)); }
  function playStep() {
    var B = window.Buddy;
    if (!playing || !B || !B.ready() || busy) { playing = false; return; }
    var act, e = pickTarget(), pose = POSES[Math.floor(Math.random() * POSES.length)], delay = 3400, w;
    do { act = ACTS[Math.floor(Math.random() * ACTS.length)]; } while (act === lastAct2);
    if (!e && act !== 'roam') act = 'roam';
    lastAct2 = act;
    if (e) { lastEl = e; w = e.getBoundingClientRect().width; }
    if (act === 'perch') { B.goTo(e, { pose: pose, secs: 2.4, dx: (Math.random() - .5) * Math.min(w * .7, 320), lift: -2 }); delay = 3200 + Math.random() * 1400; }
    else if (act === 'tramp') { B.goTo(e, { move: 'jump', lift: -2, dx: (Math.random() - .5) * Math.min(w * .6, 240) }); later(function () { B.trick('tramp'); }, 1050); delay = 4300; }
    else if (act === 'slide') { e = pickTarget(.62) || e; lastEl = e; B.goTo(e, { move: 'jump', lift: -2 }); later(function () { if (!B.trick('slide')) B.roam({ pose: 'joinha' }); }, 1250); delay = 4300; }
    else if (act === 'hang') { B.goTo(e, { move: 'jet', hang: true, pose: 'pendurado', secs: 3.2, dx: (Math.random() - .5) * Math.min(w * .6, 240) }); delay = 4600; }
    else if (act === 'drop') { B.goTo(e, { move: 'drop', pose: 'joinha', secs: 1.8, lift: -2 }); delay = 4200; }
    else if (act === 'flip') { B.goTo(e, { move: 'flip', pose: 'comemorando', secs: 2, lift: -2 }); delay = 3800; }
    else if (act === 'peek') { var side = Math.random() < .5 ? -1 : 1; B.goTo(e, { move: 'tele', pose: 'espiando', secs: 2.6, dx: side * w * .5, face: -side }); delay = 4000; }
    else { if (B.perched()) B.release(false); if (!B.roam({ pose: pose, secs: 2.2 }) && e) B.goTo(e, { pose: pose, secs: 2.4, lift: -2 }); delay = 3600; }
    ptimer = setTimeout(playStep, delay);
  }
  function stopPlay(rel) { if (!playing) return; playing = false; clearTimeout(ptimer); tms.forEach(clearTimeout); tms = []; var B = window.Buddy; if (rel !== false && B && B.perched()) B.release(true); }
  window.addEventListener('scroll', function () { lastAct = performance.now(); stopPlay(); }, { passive: true });
  ['pointerdown', 'keydown'].forEach(function (n) { window.addEventListener(n, function () { lastAct = performance.now(); stopPlay(false); }, true); });
  if (!RM) setInterval(function () {
    var B = window.Buddy, now = performance.now();
    if (playing || busy || !B || !B.ready()) return;
    if (now - lastAct < (B.perched() && onPalco() ? 5000 : 2000)) return;
    if (B.perched() && !onPalco()) return;
    var m = document.getElementById('modal'); if (m && !m.hidden) return;
    playing = true; playStep();
  }, 500);
})();
