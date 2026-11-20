/* Entradas guiadas: ao rolar, o robô vai até o título da seção e "puxa" os blocos para dentro da página. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches, root = document.documentElement;
  var SECS = [
    ['#agenda', '.eyebrow, h2, .lead, .trio article, .steps li'],
    ['#modelos', '.eyebrow, h2, .lead, .palco, .note'],
    ['#quem', '.about-grid > *'],
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

  // parado: o robô voa ao lado do texto (sem cobrir a escrita) por ~7 s, pousa como no fim do teletransporte
  // e faz o sinal de positivo. Depois fica quieto até o visitante mexer de novo.
  var lastAct = performance.now(), playing = false, descansando = false, tms = [];
  function onPalco() { var B = window.Buddy, e = B && B.el && B.el(); return !!(e && e.closest && e.closest('.palco')); }
  function later(fn, ms) { tms.push(setTimeout(function () { if (playing) fn(); }, ms)); }
  function playStep() {
    var B = window.Buddy;
    if (!playing || !B || !B.ready() || busy) { playing = false; return; }
    if (B.perched()) B.release(false);
    if (!B.hover()) { playing = false; return; }
    later(function () { B.land(); }, 7000);
    later(function () { playing = false; descansando = true; }, 7000 + 1100);
  }
  function stopPlay(rel) {
    descansando = false;
    if (!playing) return;
    playing = false; tms.forEach(clearTimeout); tms = [];
    var B = window.Buddy; if (B) { B.endHover(); if (rel !== false && B.perched()) B.release(true); }
  }
  window.addEventListener('scroll', function () { lastAct = performance.now(); stopPlay(); }, { passive: true });
  ['pointerdown', 'keydown'].forEach(function (n) { window.addEventListener(n, function () { lastAct = performance.now(); stopPlay(false); }, true); });
  if (!RM) setInterval(function () {
    var B = window.Buddy, now = performance.now();
    if (playing || descansando || busy || !B || !B.ready()) return;
    if (now - lastAct < (B.perched() && onPalco() ? 5000 : 3000)) return;
    if (B.perched() && !onPalco()) return;
    var m = document.getElementById('modal'); if (m && !m.hidden) return;
    if (document.documentElement.classList.contains('bf-aberto')) return;
    playing = true; playStep();
  }, 500);
})();
