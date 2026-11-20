/* Palco da seção "A solução": carrossel de negócios (arrastar ou setas). Tocar no cartão abre a prévia.
   Os modelos que já estão no ar vêm primeiro: salão (Espaço Beauty), pizzaria e academia. */
(function () {
  var F = window.Forja, sec = document.getElementById('modelos'), grid = document.getElementById('grid');
  if (!F || !F.shops || !sec || !grid) return;
  var SH = F.shops, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = function (slug) { return 'assets/img/loja-' + slug + '.webp'; };
  var PRIMEIROS = ['salao', 'pizzaria', 'academia'];
  var ORD = [];                                   // ORD[posição no carrossel] = índice da loja em F.shops
  PRIMEIROS.forEach(function (slug) { SH.forEach(function (s, i) { if (s.slug === slug) ORD.push(i); }); });
  SH.forEach(function (s, i) { if (ORD.indexOf(i) < 0) ORD.push(i); });
  var N = ORD.length, cur = 0, timer = 0;
  var titulo = function (s) { return s.brand || s.kicker; };
  var linha = function (s) { return (s.brand ? s.kicker : 'Modelo de site') + (s.url ? ' · no ar' : ''); };

  var st = document.createElement('div'); st.className = 'palco';
  st.innerHTML =
    '<div class="pl-row pl-shops" aria-label="Tipo de negócio">' + ORD.map(function (k, p) {
      var s = SH[k];
      return '<button type="button" class="pl-chip" data-p="' + p + '"><img src="' + IMG(s.slug) + '" alt="" loading="lazy"><span>' + s.kicker + '</span></button>';
    }).join('') + '</div>' +
    '<div class="pl-car" role="region" aria-roledescription="carrossel" aria-label="Modelos por tipo de negócio">' +
    '<div class="pl-track" tabindex="0">' + ORD.map(function (k, p) {
      var s = SH[k];
      return '<article class="pl-screen pl-slide" data-p="' + p + '" role="button" tabindex="-1" aria-roledescription="slide" aria-label="' + (p + 1) + ' de ' + N + ': ' + s.kicker + '. Toque para abrir a prévia.">' +
        '<div class="pl-img"><img src="' + IMG(s.slug) + '" alt="Fachada ilustrada: ' + s.kicker.toLowerCase() + '" loading="' + (p < 2 ? 'eager' : 'lazy') + '"></div>' +
        '<div class="pl-txt"><p class="k">' + linha(s) + '</p><h3>' + titulo(s) + '</h3><p class="dor">' + s.dor + '</p><p class="sol">' + s.sol + '</p>' +
        '<p class="pl-tap">Toque para ver o site <span aria-hidden="true">→</span></p></div></article>';
    }).join('') + '</div>' +
    '<div class="pl-nav">' +
    '<button type="button" class="pl-arrow pl-prev" aria-label="Negócio anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div class="pl-where"><b class="pl-name"></b><span class="pl-count"></span><span class="pl-dots" aria-hidden="true">' + ORD.map(function () { return '<i></i>'; }).join('') + '</span></div>' +
    '<button type="button" class="pl-arrow pl-next" aria-label="Próximo negócio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
    '</div></div>';
  grid.parentNode.insertBefore(st, grid); grid.hidden = true;

  var chips = st.querySelectorAll('.pl-chip'), track = st.querySelector('.pl-track'),
    slides = st.querySelectorAll('.pl-slide'), dots = st.querySelectorAll('.pl-dots i');
  function render() {
    var s = SH[ORD[cur]];
    chips.forEach(function (c, i) { c.classList.toggle('on', i === cur); c.setAttribute('aria-pressed', i === cur); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); });
    slides.forEach(function (sl, i) { sl.classList.toggle('on', i === cur); });
    st.querySelector('.pl-name').textContent = s.kicker;
    st.querySelector('.pl-count').textContent = (cur + 1) + ' de ' + N;
  }
  // leva o carrossel até a posição p (só rola o trilho, não a página)
  function slideTo(p, smooth) {
    var sl = slides[p]; if (!sl) return;
    track.scrollTo({ left: sl.offsetLeft - (track.clientWidth - sl.offsetWidth) / 2, behavior: smooth && !RM ? 'smooth' : 'auto' });
  }
  // descobre qual slide está no centro depois do arrasto
  var raf = 0, lockUntil = 0;   // durante o deslize pedido pelas setas, o arrasto não muda a escolha
  track.addEventListener('scroll', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      slides.forEach(function (sl, i) { var d = Math.abs(sl.offsetLeft + sl.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (performance.now() < lockUntil) { if (best === cur) lockUntil = 0; return; }
      if (best !== cur) { cur = best; render(); }
    });
  }, { passive: true });
  var SMALL = matchMedia('(max-width: 720px)');                                   // celular: o robô não pousa nos botões (cobriria o cartão)
  function robot(el, pose) {
    if (!window.Buddy || !Buddy.ready() || SMALL.matches || !el) return false;
    var r = el.getBoundingClientRect(), H = innerHeight, head = Math.min(190, H * .26), dy = 0;       // traz o botão (com folga para o robô em cima) para a tela
    if (r.top < head + 70) dy = r.top - (head + 70); else if (r.bottom > H - 70) dy = r.bottom - (H - 70);
    if (dy) { scrollBy({ top: dy, behavior: RM ? 'auto' : 'smooth' }); setTimeout(function () { Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 }); }, RM ? 0 : 520); }
    else Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 });
    return true;
  }
  function pick(p, byUser) { cur = (p + N) % N; lockUntil = performance.now() + 900; render(); slideTo(cur, true); if (byUser) robot(chips[cur], 'joinha'); }
  function open(p) { F.open(ORD[p], 1); }

  st.addEventListener('click', function (e) {
    var c = e.target.closest('.pl-chip'), sl = e.target.closest('.pl-slide');
    if (c) pick(+c.dataset.p, true);
    else if (e.target.closest('.pl-prev')) pick(cur - 1, false);
    else if (e.target.closest('.pl-next')) pick(cur + 1, false);
    else if (sl) { var p = +sl.dataset.p; if (p !== cur) pick(p, false); else open(p); }   // cartão do lado: só traz para o centro
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); pick(cur + 1, false); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pick(cur - 1, false); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(cur); }
  });
  window.addEventListener('resize', function () { slideTo(cur, false); });
  render(); slideTo(0, false);

  // computador: ao chegar no palco, o robô sobe no botão do negócio escolhido
  var inView = false;
  function arrive() { if (!window.Buddy || !Buddy.ready() || Buddy.perched()) return; robot(chips[cur], 'joinha'); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
    var on = en[0].isIntersecting; if (on === inView) return; inView = on;
    if (on) timer = setTimeout(arrive, RM ? 0 : 700);
    else { clearTimeout(timer); if (window.Buddy && Buddy.perched() && st.contains(Buddy.el && Buddy.el())) Buddy.release(true); }
  }, { threshold: .35 }).observe(st);
  window.addEventListener('scroll', function () { if (inView && window.Buddy && Buddy.ready() && !Buddy.perched()) { clearTimeout(timer); timer = setTimeout(arrive, 900); } }, { passive: true });
})();
