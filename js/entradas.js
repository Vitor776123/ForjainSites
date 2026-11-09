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
      var B = window.Buddy, can = B && B.ready() && !RM && !B.perched() && !busy && r.top > -80;
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
})();
