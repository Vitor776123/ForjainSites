/* Palco da seção "A solução": carrossel de negócios (arrastar ou setas) + pacotes; o robô clica nos botões. */
(function () {
  var F = window.Forja, sec = document.getElementById('modelos'), grid = document.getElementById('grid');
  if (!F || !F.shops || !sec || !grid) return;
  var SH = F.shops, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = function (slug) { return 'assets/img/loja-' + slug + '.webp'; };
  var PK = [
    { n: 'Essencial', d: 'Site estático, direto ao ponto: a base para estar no Google e no WhatsApp.', pose: 'joinha' },
    { n: 'Movimento', d: 'Entrada com animação e GIF no topo: o site já chama atenção de cara.', pose: 'pensativo' },
    { n: 'Com mascote', d: 'Um mascote com personalidade guia o cliente pelo site, como o Forjabô.', pose: 'comemorando' }
  ];
  var cur = 0, pk = 0, timer = 0;

  var N = SH.length;
  var st = document.createElement('div'); st.className = 'palco';
  st.innerHTML =
    '<div class="pl-row pl-shops" aria-label="Tipo de negócio">' + SH.map(function (s, i) {
      return '<button type="button" class="pl-chip" data-i="' + i + '"><img src="' + IMG(s.slug) + '" alt="" loading="lazy"><span>' + s.kicker + '</span></button>';
    }).join('') + '</div>' +
    '<div class="pl-car" role="region" aria-roledescription="carrossel" aria-label="Modelos por tipo de negócio">' +
    '<div class="pl-track" tabindex="0">' + SH.map(function (s, i) {
      return '<article class="pl-screen pl-slide" data-i="' + i + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' de ' + N + ': ' + s.kicker + '">' +
        '<div class="pl-img"><img src="' + IMG(s.slug) + '" alt="Fachada ilustrada da ' + s.kicker.toLowerCase() + ' ' + s.brand + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '"></div>' +
        '<div class="pl-txt"><p class="k"></p><h3>' + s.brand + '</h3><p class="dor">' + s.dor + '</p><p class="sol">' + s.sol + '</p>' +
        '<p class="pl-badge"><i></i> Site no ar (modelo)</p></div></article>';
    }).join('') + '</div>' +
    '<div class="pl-nav">' +
    '<button type="button" class="pl-arrow pl-prev" aria-label="Negócio anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div class="pl-where"><b class="pl-name"></b><span class="pl-count"></span><span class="pl-dots" aria-hidden="true">' + SH.map(function () { return '<i></i>'; }).join('') + '</span></div>' +
    '<button type="button" class="pl-arrow pl-next" aria-label="Próximo negócio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
    '</div></div>' +
    '<div class="pl-row pl-pks" role="tablist" aria-label="Pacote">' + PK.map(function (p, i) {
      return '<button type="button" class="pl-pk" role="tab" data-p="' + i + '"><b>' + p.n + '</b><small>' + p.d + '</small></button>';
    }).join('') + '</div>' +
    '<div class="pl-go"><button type="button" class="btn btn-cyan pl-open">Abrir prévia completa</button></div>';
  grid.parentNode.insertBefore(st, grid); grid.hidden = true;

  var chips = st.querySelectorAll('.pl-chip'), pks = st.querySelectorAll('.pl-pk'), track = st.querySelector('.pl-track'),
    slides = st.querySelectorAll('.pl-slide'), dots = st.querySelectorAll('.pl-dots i');
  function render() {
    var s = SH[cur];
    chips.forEach(function (c, i) { c.classList.toggle('on', i === cur); c.setAttribute('aria-pressed', i === cur); });
    pks.forEach(function (c, i) { c.classList.toggle('on', i === pk); c.setAttribute('aria-selected', i === pk); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); });
    slides.forEach(function (sl, i) { sl.classList.toggle('on', i === cur); sl.querySelector('.k').textContent = SH[i].kicker + ' · pacote ' + PK[pk].n; });
    st.querySelector('.pl-name').textContent = s.kicker;
    st.querySelector('.pl-count').textContent = (cur + 1) + ' de ' + N;
    st.querySelector('.pl-open').textContent = 'Abrir prévia: ' + s.kicker;
  }
  // leva o carrossel até o negócio i (só rola o trilho, não a página)
  function slideTo(i, smooth) {
    var sl = slides[i]; if (!sl) return;
    track.scrollTo({ left: sl.offsetLeft - (track.clientWidth - sl.offsetWidth) / 2, behavior: smooth && !RM ? 'smooth' : 'auto' });
  }
  // descobre qual slide está no centro depois do arrasto
  var raf = 0;
  track.addEventListener('scroll', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      slides.forEach(function (sl, i) { var d = Math.abs(sl.offsetLeft + sl.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best !== cur) { cur = best; render(); }
    });
  }, { passive: true });
  function robot(el, pose) {
    if (!window.Buddy || !Buddy.ready()) return false;
    var r = el.getBoundingClientRect(), H = innerHeight, head = Math.min(190, H * .26), dy = 0;       // traz o botão (com folga para o robô em cima) para a tela
    if (r.top < head + 70) dy = r.top - (head + 70); else if (r.bottom > H - 70) dy = r.bottom - (H - 70);
    if (dy) { scrollBy({ top: dy, behavior: RM ? 'auto' : 'smooth' }); setTimeout(function () { Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 }); }, RM ? 0 : 520); }
    else Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 });
    return true;
  }
  function pickShop(i, byUser) { cur = (i + N) % N; render(); slideTo(cur, true); if (byUser && chips[cur].offsetParent) robot(chips[cur], 'joinha'); }
  function pickPk(i, byUser) { pk = i; render(); if (byUser) robot(pks[i], PK[i].pose); }
  function open() { F.open(cur, pk + 1); }

  st.addEventListener('click', function (e) {
    var c = e.target.closest('.pl-chip'), p = e.target.closest('.pl-pk');
    if (c) pickShop(+c.dataset.i, true); else if (p) pickPk(+p.dataset.p, true);
    else if (e.target.closest('.pl-prev')) pickShop(cur - 1, false);
    else if (e.target.closest('.pl-next')) pickShop(cur + 1, false);
    else if (e.target.closest('.pl-slide')) open();
    else if (e.target.closest('.pl-open')) open();
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); pickShop(cur + 1, false); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pickShop(cur - 1, false); }
  });
  window.addEventListener('resize', function () { slideTo(cur, false); });
  render(); slideTo(0, false);

  // ao chegar no palco, o robô sobe direto no botão selecionado (pacote) e fica lá; se o visitante clicar, ele vai até o clicado
  var inView = false;
  function arrive() { if (!window.Buddy || !Buddy.ready() || Buddy.perched()) return; robot(pks[pk], 'joinha'); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) {
    var on = en[0].isIntersecting; if (on === inView) return; inView = on;
    if (on) timer = setTimeout(arrive, RM ? 0 : 700);
    else { clearTimeout(timer); if (window.Buddy && Buddy.perched() && st.contains(Buddy.el && Buddy.el())) Buddy.release(true); }
  }, { threshold: .35 }).observe(st);
  window.addEventListener('scroll', function () { if (inView && window.Buddy && Buddy.ready() && !Buddy.perched()) { clearTimeout(timer); timer = setTimeout(arrive, 900); } }, { passive: true });
})();
