/* Palco da seção "A solução": o robô clica nos botões (pula, voa ou teleporta até eles). */
(function () {
  var F = window.Forja, sec = document.getElementById('modelos'), grid = document.getElementById('grid');
  if (!F || !F.shops || !sec || !grid) return;
  var SH = F.shops, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = function (slug) { return 'assets/img/loja-' + slug + '.webp'; };
  var PK = [
    { n: 'Essencial', d: 'Site estático, direto ao ponto: a base para estar no Google e no WhatsApp.', pose: 'joinha' },
    { n: 'Movimento', d: 'Entrada com animação e GIF no topo: o site já chama atenção de cara.', pose: 'apontando' },
    { n: 'Com mascote', d: 'Um mascote com personalidade guia o cliente pelo site, como o Forjabô.', pose: 'comemorando' }
  ];
  var cur = 0, pk = 0, timer = 0;

  var st = document.createElement('div'); st.className = 'palco';
  st.innerHTML =
    '<div class="pl-row pl-shops" role="tablist" aria-label="Tipo de negócio">' + SH.map(function (s, i) {
      return '<button type="button" class="pl-chip" role="tab" data-i="' + i + '"><img src="' + IMG(s.slug) + '" alt="" loading="lazy"><span>' + s.kicker + '</span></button>';
    }).join('') + '</div>' +
    '<div class="pl-screen"><div class="pl-img"><img alt=""></div><div class="pl-txt"><p class="k"></p><h3></h3><p class="dor"></p><p class="sol"></p>' +
    '<p class="pl-badge"><i></i> Site no ar (modelo)</p></div></div>' +
    '<div class="pl-row pl-pks" role="tablist" aria-label="Pacote">' + PK.map(function (p, i) {
      return '<button type="button" class="pl-pk" role="tab" data-p="' + i + '"><b>' + p.n + '</b><small>' + p.d + '</small></button>';
    }).join('') + '</div>' +
    '<div class="pl-go"><button type="button" class="btn btn-cyan pl-open">Abrir prévia completa</button></div>';
  grid.parentNode.insertBefore(st, grid); grid.hidden = true;

  var chips = st.querySelectorAll('.pl-chip'), pks = st.querySelectorAll('.pl-pk'), img = st.querySelector('.pl-img img'), scr = st.querySelector('.pl-screen');
  function render() {
    var s = SH[cur];
    chips.forEach(function (c, i) { c.classList.toggle('on', i === cur); c.setAttribute('aria-selected', i === cur); });
    pks.forEach(function (c, i) { c.classList.toggle('on', i === pk); c.setAttribute('aria-selected', i === pk); });
    img.src = IMG(s.slug); img.alt = 'Fachada ilustrada da ' + s.kicker.toLowerCase() + ' ' + s.brand;
    st.querySelector('.k').textContent = s.kicker + ' · pacote ' + PK[pk].n;
    st.querySelector('h3').textContent = s.brand;
    st.querySelector('.dor').textContent = s.dor;
    st.querySelector('.sol').textContent = s.sol;
    scr.classList.remove('flash'); void scr.offsetWidth; scr.classList.add('flash');
  }
  function robot(el, pose) {
    if (!window.Buddy || !Buddy.ready()) return false;
    var r = el.getBoundingClientRect(), H = innerHeight, head = Math.min(190, H * .26), dy = 0;       // traz o botão (com folga para o robô em cima) para a tela
    if (r.top < head + 70) dy = r.top - (head + 70); else if (r.bottom > H - 70) dy = r.bottom - (H - 70);
    if (dy) { scrollBy({ top: dy, behavior: RM ? 'auto' : 'smooth' }); setTimeout(function () { Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 }); }, RM ? 0 : 520); }
    else Buddy.goTo(el, { pose: pose, secs: 2.6, lift: -4 });
    return true;
  }
  function pickShop(i, byUser) { cur = i; render(); if (byUser) robot(chips[i], 'feliz'); }
  function pickPk(i, byUser) { pk = i; render(); if (byUser) robot(pks[i], PK[i].pose); }
  var openBtn = st.querySelector('.pl-open');
  function open() { F.open(cur, pk + 1); }

  st.addEventListener('click', function (e) {
    var c = e.target.closest('.pl-chip'), p = e.target.closest('.pl-pk');
    if (c) pickShop(+c.dataset.i, true); else if (p) pickPk(+p.dataset.p, true);
    else if (e.target.closest('.pl-open')) open();
    clearTimeout(timer); timer = 0;
  });
  render();

  // demonstração: quando o palco aparece, o robô passeia pelos botões (uma vez); qualquer toque do visitante interrompe
  var done = false;
  function demo() {
    if (done || RM || !window.Buddy || !Buddy.ready()) return; done = true;
    var seq = [[function () { pickShop(1); robot(chips[1], 'feliz'); }, 600], [function () { pickPk(1); robot(pks[1], 'apontando'); }, 2300],
               [function () { pickPk(2); robot(pks[2], 'comemorando'); }, 2300], [function () { robot(openBtn, 'joinha'); }, 2300],
               [function () { Buddy.release(true); }, 2600]];
    var k = 0;
    (function next() { if (k >= seq.length) return; var s = seq[k++]; timer = setTimeout(function () { s[0](); next(); }, s[1]); })();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en, o) {
    if (en[0].isIntersecting && en[0].intersectionRatio > .6) { o.disconnect(); setTimeout(demo, 500); }
  }, { threshold: [.6] }).observe(st);
})();
