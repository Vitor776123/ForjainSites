/* Busca da barra do topo: "Qual é o seu negócio?" — leva o Forjabô até a loja do modelo mais parecido. */
(function () {
  'use strict';
  var form = document.getElementById('search'), input = document.getElementById('q'), res = document.getElementById('sres'),
      openBtn = document.getElementById('sopen'), closeBtn = document.getElementById('sclose');
  if (!form || !input || !res) return;
  var CFG = window.SITE || {};
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // [índice da loja na rua, nome do modelo, palavras que o cliente costuma digitar]
  var BIZ = [
    [0, 'Padaria', 'padaria pao paes confeitaria bolo bolos doce doces cafe cafeteria salgado salgados lanchonete padeiro'],
    [1, 'Adega', 'adega vinho vinhos bebida bebidas cerveja distribuidora emporio drinks conveniencia tabacaria'],
    [2, 'Academia', 'academia fitness treino musculacao crossfit pilates yoga personal studio estudio danca luta'],
    [3, 'Barbearia', 'barbearia barbeiro barba cabelo salao cabeleireiro beleza estetica manicure unha unhas sobrancelha'],
    [4, 'Pet Shop', 'pet petshop cachorro gato veterinario veterinaria racao animal animais banho tosa'],
    [5, 'Pizzaria', 'pizza pizzaria restaurante hamburguer hamburgueria lanche delivery comida bar marmita sushi churrasco japones'],
    [6, 'Farmácia', 'farmacia drogaria remedio remedios saude manipulacao clinica dentista odontologia otica consultorio'],
    [7, 'Oficina', 'oficina mecanica mecanico carro carros auto automotivo funilaria borracharia moto motos lavajato pecas pneu'],
    [8, 'Moda', 'roupa roupas moda boutique brecho calcado calcados sapato sapatos acessorios semijoia bolsa loja vestuario'],
    [9, 'Floricultura', 'flor flores floricultura buque buques jardim jardinagem planta plantas presente presentes cesta cestas']
  ];
  var norm = function (t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); };
  var KW = BIZ.map(function (b) { return norm(b[2]).split(' '); });

  function match(q) {
    var toks = norm(q).split(' ').filter(function (t) { return t.length >= 2; });
    if (!toks.length) return [];
    var out = [];
    BIZ.forEach(function (b, k) {
      var sc = 0;
      toks.forEach(function (t) {
        KW[k].forEach(function (w) {
          if (w === t) sc += 4; else if (w.indexOf(t) === 0) sc += 3; else if (t.length >= 4 && w.length >= 4 && (t.indexOf(w) === 0 || w.indexOf(t) === 0)) sc += 2;
          else if (t.length >= 3 && w.indexOf(t) > 0) sc += 1;
        });
      });
      if (sc > 0) out.push({ b: b, sc: sc });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return out.map(function (o) { return o.b; });
  }

  var items = [], act = -1;
  function waLink(q) {
    var n = (CFG.whatsapp || '').replace(/\D/g, '');
    if (!n) return '';
    var msg = 'Oi! Vi o portfólio da Forja de inSITES. O meu negócio é ' + q + ' e queria ver como ficaria o site.';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
  }
  function render() {
    var q = input.value.trim(), list = q ? match(q) : BIZ, html = '';
    items = [];
    list.forEach(function (b) {
      items.push({ i: b[0] });
      html += '<button type="button" role="option" class="sr-it" data-k="' + (items.length - 1) + '"><span class="sr-n">' + b[1] + '</span><span class="sr-m">modelo de site →</span></button>';
    });
    if (q && !list.length) {
      var wa = waLink(q);
      html += '<p class="sr-none">Ainda não tenho um modelo para “' + q.replace(/[<>&"]/g, '') + '”, mas monto um sob medida.</p>' +
        (wa ? '<a class="sr-wa" href="' + wa + '" target="_blank" rel="noopener">Chamar no WhatsApp</a>' : '') +
        '<a class="sr-all" href="#modelos">Ver todos os modelos</a>';
    } else if (!q) html = '<p class="sr-hd">Escolha o tipo do seu negócio</p>' + html;
    res.innerHTML = html; act = -1;
    res.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  function closeRes() { res.hidden = true; input.setAttribute('aria-expanded', 'false'); act = -1; }
  function mark(n) {
    var els = res.querySelectorAll('.sr-it');
    for (var k = 0; k < els.length; k++) els[k].classList.toggle('on', k === n);
    act = n;
  }
  function pick(k) {
    var it = items[k]; if (!it) return;
    closeRes(); input.blur(); form.classList.remove('open');
    input.value = BIZ[it.i][1];
    if (window.Forja && window.Forja.goShop) window.Forja.goShop(it.i);
  }

  input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false');
  input.addEventListener('focus', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    var els = res.querySelectorAll('.sr-it');
    if (e.key === 'ArrowDown') { e.preventDefault(); if (res.hidden) render(); mark(Math.min(els.length - 1, act + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(Math.max(0, act - 1)); }
    else if (e.key === 'Escape') { closeRes(); form.classList.remove('open'); input.blur(); }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (act >= 0) pick(act); else if (items.length) pick(0);
    else if (input.value.trim()) { var wa = waLink(input.value.trim()); if (wa) window.open(wa, '_blank', 'noopener'); }
  });
  res.addEventListener('pointerdown', function (e) { e.preventDefault(); });       // não deixa o campo perder o foco antes do clique
  res.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.sr-it');
    if (b) { pick(+b.dataset.k); return; }
    if (e.target.closest && e.target.closest('.sr-all')) { closeRes(); form.classList.remove('open'); }
  });
  document.addEventListener('pointerdown', function (e) { if (!form.contains(e.target)) { closeRes(); form.classList.remove('open'); } });

  // celular: a lupa abre o campo por cima da barra
  if (openBtn) openBtn.addEventListener('click', function () { form.classList.add('open'); input.value = ''; setTimeout(function () { input.focus(); }, 30); });
  if (closeBtn) closeBtn.addEventListener('click', function () { form.classList.remove('open'); closeRes(); input.blur(); });
})();
