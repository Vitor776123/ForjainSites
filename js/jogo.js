/* Forjabô na Avenida — mini runner em "falso 3D" (estilo Subway Surfers) num <canvas>.
   Etapa 1: tudo desenhado com formas; na etapa 2 as formas viram as artes (Forjabô de costas, veículos de trás).
   Controles: arrastar ← → troca de faixa, ↑ pula, ↓ desliza. Teclado: setas / WASD / espaço. */
(function () {
  'use strict';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LANE = 2.6;                    // largura de uma faixa (unidades do mundo)
  var ZP = 4;                        // distância do jogador até a câmera
  var FAR = 50;                      // até onde se desenha
  var G = 34, JUMP_V = 12.2;         // gravidade e impulso do pulo
  var SLIDE_T = 0.72, JET_T = 5.5, JET_Y = 3.3, IMA_T = 8;
  var V0 = 15, VMAX = 34, ACC = 0.32;
  var KEY_BEST = 'forja-jogo-recorde';

  /* ---------- tela ---------- */
  var root = document.createElement('div');
  root.className = 'jg'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Jogo: Forjabô na Avenida');
  root.innerHTML =
    '<canvas class="jg-cv" aria-label="Jogo. Arraste para os lados para trocar de faixa, para cima para pular e para baixo para deslizar."></canvas>' +
    '<div class="jg-hud"><div class="jg-pts"><b class="jg-n">0</b><span>clientes</span></div><div class="jg-dist"></div>' +
      '<button type="button" class="jg-x" aria-label="Sair do jogo">✕</button></div>' +
    '<div class="jg-pw">' +
      '<span class="pw" data-k="jet" hidden><img src="assets/jogo/p-jet.webp?v=1" alt="Jetpack"><i><b></b></i></span>' +
      '<span class="pw" data-k="ima" hidden><img src="assets/jogo/p-ima.webp?v=1" alt="Ímã"><i><b></b></i></span>' +
      '<span class="pw" data-k="escudo" hidden><img src="assets/jogo/p-escudo.webp?v=1" alt="Escudo"></span>' +
    '</div>' +
    '<div class="jg-tela jg-inicio">' +
      '<p class="jg-k">Mini game</p><h2>Forjabô na Avenida</h2>' +
      '<ul class="jg-ajuda"><li><span class="jg-g">⇆</span>Arraste para o lado: troca de faixa</li><li><span class="jg-g">⇡</span>Arraste para cima: pula carro e cavalete</li><li><span class="jg-g">⇣</span>Arraste para baixo: passa por baixo do caminhão</li><li><span class="jg-g"><img src="assets/jogo/p-jet.webp?v=1" alt=""></span>Jetpack: voa por cima de tudo</li><li><span class="jg-g"><img src="assets/jogo/p-ima.webp?v=1" alt=""></span>Ímã: puxa os clientes das outras faixas</li><li><span class="jg-g"><img src="assets/jogo/p-escudo.webp?v=1" alt=""></span>Escudo: aguenta uma batida</li></ul>' +
      '<p class="jg-rec"></p><button type="button" class="jg-btn jg-go">Toque para jogar</button>' +
    '</div>' +
    '<div class="jg-tela jg-fim" hidden>' +
      '<p class="jg-k">Bateu! 💥</p><h2 class="jg-res"></h2><p class="jg-sub"></p>' +
      '<button type="button" class="jg-btn jg-de-novo">Jogar de novo</button>' +
      '<button type="button" class="jg-btn jg-btn-2 jg-projeto">Começar meu projeto</button>' +
    '</div>';
  document.body.appendChild(root);
  var cv = root.querySelector('.jg-cv'), ctx = cv.getContext('2d', { alpha: false });
  var elN = root.querySelector('.jg-n'), elDist = root.querySelector('.jg-dist');
  var PW = {}; [].forEach.call(root.querySelectorAll('.pw'), function (e) { PW[e.dataset.k] = { el: e, bar: e.querySelector('b'), on: false }; });
  function hudPoder(k, frac) {                         // mostra/esconde o selo do poder e a barra de tempo
    var p = PW[k], on = frac > 0;
    if (on !== p.on) { p.on = on; p.el.hidden = !on; }
    if (on && p.bar) p.bar.style.transform = 'scaleX(' + Math.min(1, frac).toFixed(3) + ')';
  }
  var telaIni = root.querySelector('.jg-inicio'), telaFim = root.querySelector('.jg-fim');

  var DPR_MAX = 2, lentos = 0, W = 0, H = 0, DPR = 1, f = 1, camH = 6, horizon = 0, playerY = 0;
  function medir() {
    W = root.clientWidth; H = root.clientHeight;
    DPR = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    // as 3 faixas ocupam ~92% da largura na altura do jogador (máx. 560px em tela larga)
    var road = Math.min(W * 0.92, 560, H * (W > H ? 0.75 : 0.9));
    f = road * ZP / (LANE * 3);
    playerY = H * (W > H ? 0.86 : 0.83);
    horizon = H * (W > H ? 0.34 : 0.40);
    camH = (playerY - horizon) * ZP / f;
  }
  // projeta um ponto do mundo (x lateral, y altura, z distância) na tela
  var camX = 0;
  function px(x, z) { return W / 2 + (x - camX) * f / z; }
  var camY = 0;                      // a câmera sobe junto quando o robô voa (como no Subway Surfers)
  function py(y, z) { return horizon + (camH + camY - y) * f / z; }
  function sc(z) { return f / z; }

  /* ---------- artes (etapa 2): Forjabô de costas e veículos de trás ---------- */
  var IMG = {};
  ['r-corre-1', 'r-corre-2', 'r-pulo', 'r-desliza', 'r-jet', 'r-tonto', 'v-carro', 'v-caminhao', 'v-onibus', 'v-cavalete', 'c-agenda', 'c-estrela', 'c-carrinho', 'p-jet', 'p-ima', 'p-escudo'].forEach(function (n) {
    var im = new Image(); im.decoding = 'async'; im.src = 'assets/jogo/' + n + '.webp?v=1';
    im.onload = function () { if (im.decode) im.decode().catch(function () {}); };
    IMG[n] = im;
  });
  function pronta(n) { var im = IMG[n]; return im && im.complete && im.naturalWidth > 0 ? im : null; }

  /* ---------- estado ---------- */
  var S = {};
  var obs = [], coins = [], items = [], blds = [], lamps = [];
  function novoJogo() {
    S = { on: false, over: false, t: 0, v: V0, dist: 0, pts: 0, lane: 0, x: 0, y: 0, vy: 0, slide: 0, jet: 0, jetY: 0,
          run: 0, nextRow: 26, nextItem: 320, hit: 0, shake: 0, combo: 0, ima: 0, escudo: false, inv: 0, flash: 0 };
    obs.length = 0; coins.length = 0; items.length = 0;
    blds.length = 0; lamps.length = 0;
    for (var z = 2; z < FAR + 20; z += 0) z = addBld(z);
    for (var zl = 6; zl < FAR + 20; zl += 14) { lamps.push({ side: -1, z: zl }); lamps.push({ side: 1, z: zl + 7 }); }
  }
  var PAL = ['#3a4a63', '#5b4a6e', '#2f5d62', '#6b4f3a', '#47566b', '#704c5a', '#3d5a4a', '#5e5a4a'];
  function addBld(z) {
    var len = 5 + Math.random() * 6;
    [-1, 1].forEach(function (side) {
      blds.push({ side: side, z0: z, z1: z + len - 0.6, h: 6 + Math.random() * 12, c: PAL[(Math.random() * PAL.length) | 0], win: Math.random() < 0.85 });
    });
    return z + len;
  }

  /* ---------- geração de obstáculos ---------- */
  // tipos: car (pula ou desvia), truck (desliza por baixo), bus (só desvia), bar (pula ou desliza)
  var TIPO = {
    car:   { w: 2.1, len: 3.6, solid: [0, 1.5],   img: 'v-carro',    dw: 2.1 },
    truck: { w: 2.3, len: 6.5, solid: [1.0, 3.4], img: 'v-caminhao', dh: 3.4 },
    bus:   { w: 2.3, len: 9.0, solid: [0, 2.7],   img: 'v-onibus',   dw: 2.45 },
    bar:   { w: 2.3, len: 0.6, solid: [0.9, 1.5], img: 'v-cavalete', dw: 2.5 }
  };
  var CORES = ['#d6453d', '#2f6fd6', '#f2f2f2', '#2b2f36', '#f2b13a', '#3aa36b', '#9aa3ad'];
  function linha(z) {
    var dif = Math.min(1, S.t / 90);
    var lanes = [-1, 0, 1], livre = lanes[(Math.random() * 3) | 0];
    var n = Math.random() < 0.35 + dif * 0.4 ? 2 : 1;           // mais faixas ocupadas com o tempo
    var ocup = lanes.filter(function (l) { return l !== livre; }).sort(function () { return Math.random() - .5; }).slice(0, n);
    ocup.forEach(function (l) {
      var r = Math.random(), t = r < 0.42 ? 'car' : r < 0.66 ? 'truck' : r < 0.84 ? 'bar' : 'bus';
      obs.push({ t: t, lane: l, z: z + (t === 'bus' ? 2 : 0) + Math.random() * 1.2, c: CORES[(Math.random() * CORES.length) | 0] });
    });
    // fileira de clientes na faixa livre (às vezes em arco para pular)
    if (Math.random() < 0.7) {
      var arco = Math.random() < 0.3;
      for (var i = 0; i < 6; i++) coins.push({ lane: livre, x: livre * LANE, z: z - 4 + i * 1.6, y: arco ? 0.8 + Math.sin(i / 5 * Math.PI) * 1.7 : 0.8, ic: (i + (z | 0)) % 3 });
    }
    // poderes de vez em quando: jetpack, ímã ou escudo (sem repetir o que já está ativo)
    if (S.dist > S.nextItem) {
      var ops = ['jet', 'jet', 'ima', 'escudo'].filter(function (k) { return !(k === 'jet' && S.jet) && !(k === 'ima' && S.ima) && !(k === 'escudo' && S.escudo); });
      if (ops.length) items.push({ k: ops[(Math.random() * ops.length) | 0], lane: livre, z: z + 6, y: 1.1 });
      S.nextItem = S.dist + 340 + Math.random() * 260;
    }
  }

  /* ---------- entrada ---------- */
  var toque = null;
  function acao(a) {
    if (!S.on) return;
    if (a === 'L' && S.lane > -1) { S.lane--; }
    else if (a === 'R' && S.lane < 1) { S.lane++; }
    else if (a === 'U' && !S.jet) { if (S.y <= 0.001) { S.vy = JUMP_V; S.slide = 0; } }
    else if (a === 'D' && !S.jet) { if (S.y > 0.05) S.vy = -JUMP_V * 1.4; S.slide = SLIDE_T; }   // no ar: desce rápido e já desliza
  }
  cv.addEventListener('pointerdown', function (e) { toque = { x: e.clientX, y: e.clientY, t: performance.now(), feito: false, id: e.pointerId }; });
  cv.addEventListener('pointermove', function (e) {
    if (!toque || toque.feito || e.pointerId !== toque.id) return;
    var dx = e.clientX - toque.x, dy = e.clientY - toque.y, lim = Math.max(22, Math.min(W, H) * 0.05);
    if (Math.abs(dx) < lim && Math.abs(dy) < lim) return;
    toque.feito = true;
    acao(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy < 0 ? 'U' : 'D'));
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { toque = null; }); });
  window.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    var k = e.key, m = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'U', w: 'U', W: 'U', ' ': 'U', ArrowDown: 'D', s: 'D', S: 'D' }[k];
    if (k === 'Escape') { fechar(); return; }
    if (!m) return;
    e.preventDefault();
    if (!S.on && (k === ' ' || k === 'Enter')) { comecar(); return; }
    acao(m);
  });

  /* ---------- laço ---------- */
  var last = 0, raf = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    var real = last ? t - last : 16, dt = Math.min(0.033, real / 1000); last = t;
    // celular lento: baixa a resolução do desenho para manter a animação fluida
    if (S.on) { lentos = real > 24 ? lentos + 1 : Math.max(0, lentos - 1); if (lentos > 40 && DPR_MAX > 1) { DPR_MAX = Math.max(1, DPR_MAX - 0.5); lentos = 0; medir(); } }
    if (S.on) passo(dt); else if (!S.over) S.run += dt * 6;     // na tela inicial a rua anda devagar
    desenhar(dt);
  }
  function passo(dt) {
    S.t += dt;
    S.v = Math.min(VMAX, V0 + S.t * ACC);
    var dz = S.v * dt;
    S.dist += dz; S.run += dz;
    // jogador
    S.x += (S.lane * LANE - S.x) * Math.min(1, dt * 14);
    if (S.jet > 0) {
      S.jet -= dt; S.jetY += (JET_Y - S.jetY) * Math.min(1, dt * 4); S.y = S.jetY; S.vy = 0;
      if (S.jet <= 0) { S.vy = 0; S.jetY = 0; }
    } else {
      if (S.y > 0 || S.vy > 0) { S.vy -= G * dt; S.y += S.vy * dt; if (S.y <= 0) { S.y = 0; S.vy = 0; } }
    }
    if (S.slide > 0) S.slide -= dt;
    if (S.ima > 0) S.ima = Math.max(0, S.ima - dt);
    if (S.inv > 0) S.inv = Math.max(0, S.inv - dt);
    hudPoder('jet', S.jet > 0 ? S.jet / JET_T : 0); hudPoder('ima', S.ima / IMA_T); hudPoder('escudo', S.escudo ? 1 : 0);
    // mundo anda na direção do jogador
    var i;
    for (i = 0; i < obs.length; i++) obs[i].z -= dz;
    for (i = 0; i < coins.length; i++) coins[i].z -= dz;
    for (i = 0; i < items.length; i++) items[i].z -= dz;
    for (i = 0; i < blds.length; i++) { blds[i].z0 -= dz; blds[i].z1 -= dz; }
    for (i = 0; i < lamps.length; i++) lamps[i].z -= dz;
    while (blds.length && blds[0].z1 < 0.5) blds.shift();
    var fim = blds.length ? blds[blds.length - 1].z1 + 0.6 : 0; while (fim < FAR + 20) fim = addBld(fim);
    lamps.forEach(function (l) { if (l.z < 0.8) l.z += 14 * Math.ceil((FAR + 20) / 14); });
    S.nextRow -= dz;
    if (S.nextRow <= 0) { linha(FAR); S.nextRow = Math.max(11, 22 - S.t * 0.09) + Math.random() * 6; }
    // colisões
    var ph = S.slide > 0 ? 0.85 : 2.4, pw = 1.3;
    for (i = obs.length - 1; i >= 0; i--) {
      var o = obs[i], T = TIPO[o.t];
      if (o.z + T.len < 0) { obs.splice(i, 1); continue; }
      if (S.jet > 0 || S.inv > 0) continue;
      var ox = o.lane * LANE;
      if (Math.abs(S.x - ox) > (T.w + pw) / 2 * 0.82) continue;
      if (ZP < o.z - 0.3 || ZP > o.z + T.len) continue;
      if (S.y + ph <= T.solid[0] || S.y >= T.solid[1]) continue;
      if (S.escudo) {                                     // escudo: o obstáculo é jogado para longe e o robô segue
        S.escudo = false; S.inv = 1.1; S.flash = 1; S.shake = RM ? 0 : 0.45; obs.splice(i, 1);
        if (navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
        continue;
      }
      return bater(o);
    }
    for (i = coins.length - 1; i >= 0; i--) {
      var c = coins[i];
      if (c.z < 0) { coins.splice(i, 1); continue; }
      if (c.x === undefined) c.x = c.lane * LANE;
      if (S.ima > 0 && c.z < ZP + 16 && c.z > ZP - 1) {    // ímã: os clientes voam até o robô
        var kk = Math.min(1, dt * (c.z < ZP + 6 ? 12 : 5));
        c.x += (S.x - c.x) * kk; c.y += (S.y + 1.2 - c.y) * kk;
      }
      if (Math.abs(c.z - ZP) < 0.9 && Math.abs(S.x - c.x) < 1.2 && Math.abs(c.y - (S.y + 1.2)) < 1.6) {
        coins.splice(i, 1); S.pts++; elN.textContent = S.pts; pop();
      }
    }
    for (i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.z < 0) { items.splice(i, 1); continue; }
      if (Math.abs(it.z - ZP) < 1 && Math.abs(S.x - it.lane * LANE) < 1.3 && S.y < 2.5) {
        items.splice(i, 1); pegouPoder();
        if (it.k === 'ima') S.ima = IMA_T;
        else if (it.k === 'escudo') S.escudo = true;
        else {
          S.jet = JET_T; S.jetY = S.y; S.slide = 0;
          for (var k = 0; k < 26; k++) { var ln = [-1, 0, 1][(k / 9 | 0) % 3]; coins.push({ lane: ln, x: ln * LANE, z: ZP + 6 + k * 2.2, y: JET_Y + 1.0, ic: k % 3 }); }
        }
      }
    }
    elDist.textContent = Math.floor(S.dist) + ' m';
  }
  var popT = 0;
  function pegouPoder() { S.flash = 0.7; if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {} }
  function pop() { popT = 1; elN.parentNode.classList.remove('pop'); void elN.offsetWidth; elN.parentNode.classList.add('pop'); if (navigator.vibrate) try { navigator.vibrate(6); } catch (_) {} }
  function bater(o) {
    S.on = false; S.over = true; S.hit = 1; S.shake = RM ? 0 : 1;
    if (navigator.vibrate) try { navigator.vibrate([40, 30, 60]); } catch (_) {}
    var best = 0; try { best = +localStorage.getItem(KEY_BEST) || 0; } catch (_) {}
    var recorde = S.pts > best; if (recorde) try { localStorage.setItem(KEY_BEST, S.pts); } catch (_) {}
    var nome = { car: 'um carro', truck: 'o caminhão', bus: 'o ônibus', bar: 'o cavalete' }[o.t];
    setTimeout(function () {
      telaFim.querySelector('.jg-res').textContent = 'Você conquistou ' + S.pts + (S.pts === 1 ? ' cliente!' : ' clientes!');
      telaFim.querySelector('.jg-sub').textContent = (recorde && S.pts ? '🏆 Novo recorde! ' : 'Recorde: ' + Math.max(best, S.pts) + '. ') + 'Bateu em ' + nome + ' depois de ' + Math.floor(S.dist) + ' m. Imagina com um site de verdade 😉';
      telaFim.hidden = false; telaFim.querySelector('.jg-de-novo').focus({ preventScroll: true });
    }, RM ? 0 : 650);
  }

  /* ---------- desenho ---------- */
  function quad(a, b, c, d, cor) { ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function nevoa(z) { return Math.max(0, Math.min(1, (FAR - z) / 12)); }
  var CEU = null, GH = null;
  function desenhar(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sh = 0;
    if (S.shake > 0) { S.shake = Math.max(0, S.shake - dt * 2.5); sh = S.shake * 9; ctx.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh); }
    camX += (S.x * 0.55 - camX) * Math.min(1, dt * 8);
    camY += ((S.jet > 0 ? S.y * 0.85 : S.y * 0.25) - camY) * Math.min(1, dt * 6);
    // céu (fim de tarde, como a rua do topo)
    if (!CEU || CEU.h !== H) { CEU = ctx.createLinearGradient(0, 0, 0, horizon); CEU.addColorStop(0, '#26356a'); CEU.addColorStop(0.55, '#e5806b'); CEU.addColorStop(1, '#ffd39a'); CEU.h = H; }
    ctx.fillStyle = CEU; ctx.fillRect(-20, -20, W + 40, horizon + 22);
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);
    var zn = 0.9, zf = FAR;
    // calçadas e rua
    var RE = LANE * 1.5, SW = RE + 3.2;
    quad([px(-SW, zn), py(0, zn)], [px(-SW, zf), py(0, zf)], [px(SW, zf), py(0, zf)], [px(SW, zn), py(0, zn)], '#cfc8bc');
    quad([px(-RE, zn), py(0, zn)], [px(-RE, zf), py(0, zf)], [px(RE, zf), py(0, zf)], [px(RE, zn), py(0, zn)], '#33373e');
    // guias
    [-RE, RE].forEach(function (xx) { quad([px(xx - 0.15, zn), py(0, zn)], [px(xx - 0.15, zf), py(0, zf)], [px(xx + 0.15, zf), py(0, zf)], [px(xx + 0.15, zn), py(0, zn)], '#e8e2d6'); });
    // faixas tracejadas que andam
    var per = 6, off = S.run % per;
    for (var z = per - off; z < zf; z += per) {
      var z2 = Math.min(zf, z + 3);
      if (z2 <= zn) continue;
      var za = Math.max(zn, z);
      [-LANE / 2, LANE / 2].forEach(function (xx) { quad([px(xx - 0.1, za), py(0, za)], [px(xx - 0.1, z2), py(0, z2)], [px(xx + 0.1, z2), py(0, z2)], [px(xx + 0.1, za), py(0, za)], 'rgba(242,214,90,.85)'); });
    }
    // prédios (fundo para frente)
    for (var b = blds.length - 1; b >= 0; b--) desenhaPredio(blds[b], SW);
    // objetos: ordena do mais longe para o mais perto, com o jogador no meio
    var lista = [];
    obs.forEach(function (o) { if (o.z < FAR && o.z > ZP - 0.6) lista.push({ z: o.z, o: o }); });   // passou do robô: sai de cena (não tapa a visão)
    coins.forEach(function (c) { if (c.z < FAR && c.z > ZP - 0.8) lista.push({ z: c.z, c: c }); });
    items.forEach(function (it) { if (it.z < FAR && it.z > ZP - 0.8) lista.push({ z: it.z, it: it }); });
    lamps.forEach(function (l) { if (l.z < FAR && l.z > 0.9) lista.push({ z: l.z, l: l }); });
    lista.push({ z: ZP + 0.01, p: true });
    lista.sort(function (a, b2) { return b2.z - a.z; });
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i];
      if (e.p) desenhaJogador(); else if (e.o) desenhaVeiculo(e.o); else if (e.c) desenhaCliente(e.c); else if (e.it) desenhaJet(e.it); else desenhaPoste(e.l, SW);
    }
    // brilho do horizonte
    if (!GH || GH.h !== horizon) { GH = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 40); GH.addColorStop(0, 'rgba(255,211,154,0)'); GH.addColorStop(0.5, 'rgba(255,211,154,.35)'); GH.addColorStop(1, 'rgba(255,211,154,0)'); GH.h = horizon; }
    ctx.fillStyle = GH; ctx.fillRect(-20, horizon - 30, W + 40, 70);
    if (S.flash > 0) { S.flash = Math.max(0, S.flash - dt * 2.2); ctx.fillStyle = 'rgba(61,232,240,' + (S.flash * 0.22) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
    if (S.hit > 0) { S.hit = Math.max(0, S.hit - dt * 1.6); ctx.fillStyle = 'rgba(255,60,40,' + (S.hit * 0.35) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  }
  function desenhaPredio(bd, SW) {
    var z0 = Math.max(0.9, bd.z0), z1 = Math.min(FAR, bd.z1);
    if (z1 <= z0) return;
    var x = bd.side * (SW + 0.1), a = nevoa(z1);
    ctx.globalAlpha = 0.35 + 0.65 * a;
    quad([px(x, z0), py(0, z0)], [px(x, z1), py(0, z1)], [px(x, z1), py(bd.h, z1)], [px(x, z0), py(bd.h, z0)], bd.c);
    // fachada da frente (topo escuro) e janelas acesas
    if (bd.win) {
      ctx.fillStyle = 'rgba(255,214,140,.55)'; ctx.beginPath();          // todas as janelas do prédio num desenho só
      for (var zz = bd.z0 + 0.8; zz < bd.z1 - 0.6; zz += 1.6) {
        if (zz < 0.9 || zz + 0.7 > FAR) continue;
        var xa = px(x, zz), xb = px(x, zz + 0.7);
        for (var hh = 1.6; hh < bd.h - 1; hh += 2.1) {
          ctx.moveTo(xa, py(hh, zz)); ctx.lineTo(xb, py(hh, zz + 0.7)); ctx.lineTo(xb, py(hh + 1.1, zz + 0.7)); ctx.lineTo(xa, py(hh + 1.1, zz));
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function desenhaPoste(l, SW) {
    var x = l.side * (SW - 0.6), z = l.z, s = sc(z), bx = px(x, z), by = py(0, z), top = py(5.2, z);
    ctx.globalAlpha = nevoa(z);
    ctx.fillStyle = '#4a515b'; ctx.fillRect(bx - 0.09 * s, top, 0.18 * s, by - top);
    ctx.fillStyle = '#ffe7a6'; ctx.beginPath(); ctx.arc(px(x - l.side * 0.7, z), top, 0.28 * s, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function desenhaVeiculo(o) {
    var T = TIPO[o.t], z = Math.max(o.z, 0.75), s = sc(z), cx = px(o.lane * LANE, z), gy = py(0, z), w = T.w * s;
    ctx.globalAlpha = nevoa(z);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(cx, gy, w * 0.58, 0.22 * s, 0, 0, 7); ctx.fill();
    var im = pronta(T.img);
    if (im) {
      var dw = T.dw ? T.dw * s : T.dh * s * im.naturalWidth / im.naturalHeight, dh = dw * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, cx - dw / 2, gy - dh + 0.06 * s, dw, dh);
      ctx.globalAlpha = 1; return;
    }
    // lateral visível (dá profundidade): face do fundo mais escura
    var zb = Math.min(FAR, o.z + T.len), sb = sc(zb);
    if (o.t === 'car') {
      var h = 1.35 * s;
      ctx.fillStyle = '#16181c'; rr(cx - w * 0.47, gy - 0.42 * s, 0.34 * s, 0.42 * s, 4); ctx.fill(); rr(cx + w * 0.47 - 0.34 * s, gy - 0.42 * s, 0.34 * s, 0.42 * s, 4); ctx.fill();
      ctx.fillStyle = o.c; rr(cx - w / 2, gy - h * 0.78, w, h * 0.5, 0.18 * s); ctx.fill();
      ctx.fillStyle = sombra(o.c); rr(cx - w * 0.4, gy - h, w * 0.8, h * 0.32, 0.25 * s); ctx.fill();
      ctx.fillStyle = '#1d2733'; rr(cx - w * 0.33, gy - h * 0.95, w * 0.66, h * 0.22, 0.12 * s); ctx.fill();
      ctx.fillStyle = '#ff3b30'; rr(cx - w * 0.47, gy - h * 0.66, w * 0.16, h * 0.1, 3); ctx.fill(); rr(cx + w * 0.31, gy - h * 0.66, w * 0.16, h * 0.1, 3); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.fillRect(cx - w * 0.12, gy - h * 0.5, w * 0.24, h * 0.1);
    } else if (o.t === 'truck') {
      var g0 = 1.25 * s, h2 = 3.7 * s;
      // vão por baixo: só rodas nas laterais
      ctx.fillStyle = '#121418'; rr(cx - w * 0.5, gy - 0.55 * s, 0.42 * s, 0.55 * s, 4); ctx.fill(); rr(cx + w * 0.5 - 0.42 * s, gy - 0.55 * s, 0.42 * s, 0.55 * s, 4); ctx.fill();
      ctx.fillStyle = '#5a5f66'; ctx.fillRect(cx - w * 0.5, gy - g0, w, 0.12 * s);
      ctx.fillStyle = '#e9ecef'; rr(cx - w / 2, gy - h2, w, h2 - g0, 0.08 * s); ctx.fill();
      ctx.fillStyle = '#c9ced4'; ctx.fillRect(cx - 0.03 * s, gy - h2 + 0.1 * s, 0.06 * s, h2 - g0 - 0.2 * s);
      ctx.fillStyle = '#ff3b30'; ctx.fillRect(cx - w * 0.48, gy - g0 - 0.3 * s, w * 0.1, 0.18 * s); ctx.fillRect(cx + w * 0.38, gy - g0 - 0.3 * s, w * 0.1, 0.18 * s);
      ctx.fillStyle = 'rgba(242,177,58,.95)'; for (var k = 0; k < 6; k++) ctx.fillRect(cx - w / 2 + k * w / 6, gy - g0 + 0.02 * s, w / 12, 0.1 * s);
      if (s > 40) { ctx.fillStyle = '#2b2f36'; ctx.font = '700 ' + Math.round(0.42 * s) + 'px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↓', cx, gy - g0 * 0.35); }
    } else if (o.t === 'bus') {
      var h3 = 3.5 * s;
      ctx.fillStyle = '#121418'; rr(cx - w * 0.47, gy - 0.5 * s, 0.4 * s, 0.5 * s, 4); ctx.fill(); rr(cx + w * 0.47 - 0.4 * s, gy - 0.5 * s, 0.4 * s, 0.5 * s, 4); ctx.fill();
      ctx.fillStyle = '#e4f0e6'; rr(cx - w / 2, gy - h3, w, h3 - 0.3 * s, 0.22 * s); ctx.fill();
      ctx.fillStyle = '#2d9d4b'; ctx.fillRect(cx - w / 2, gy - h3 * 0.42, w, h3 * 0.12);
      ctx.fillStyle = '#f2c230'; ctx.fillRect(cx - w / 2, gy - h3 * 0.3, w, h3 * 0.06);
      ctx.fillStyle = '#1d2733'; rr(cx - w * 0.42, gy - h3 * 0.92, w * 0.84, h3 * 0.36, 0.1 * s); ctx.fill();
      ctx.fillStyle = '#ff3b30'; ctx.fillRect(cx - w * 0.47, gy - h3 * 0.24, w * 0.1, h3 * 0.08); ctx.fillRect(cx + w * 0.37, gy - h3 * 0.24, w * 0.1, h3 * 0.08);
    } else {
      var y0 = 1.0 * s, y1 = 1.6 * s;
      ctx.fillStyle = '#d9dde2'; ctx.fillRect(cx - w * 0.42, gy - y1, 0.12 * s, y1); ctx.fillRect(cx + w * 0.42 - 0.12 * s, gy - y1, 0.12 * s, y1);
      ctx.save(); rr(cx - w / 2, gy - y1, w, y1 - y0, 0.06 * s); ctx.clip();
      ctx.fillStyle = '#f4f6f8'; ctx.fillRect(cx - w / 2, gy - y1, w, y1 - y0);
      ctx.fillStyle = '#ff6a1a'; for (var j = -1; j < 8; j++) { ctx.beginPath(); var bx2 = cx - w / 2 + j * w / 6; ctx.moveTo(bx2, gy - y0); ctx.lineTo(bx2 + w / 12, gy - y0); ctx.lineTo(bx2 + w / 12 + (y1 - y0), gy - y1); ctx.lineTo(bx2 + (y1 - y0), gy - y1); ctx.fill(); }
      ctx.restore();
    }
    void sb;
    ctx.globalAlpha = 1;
  }
  function sombra(hex) { var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.75, g = ((n >> 8) & 255) * 0.75, b = (n & 255) * 0.75; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  var ICON = ['📅', '⭐', '🛒'], CIMG = ['c-agenda', 'c-estrela', 'c-carrinho'];
  function desenhaCliente(c) {
    var z = c.z, s = sc(z), x = px(c.x === undefined ? c.lane * LANE : c.x, z), y = py(c.y, z), r = 0.42 * s, gir = Math.cos(S.run * 0.35 + c.z * 0.4);
    ctx.globalAlpha = nevoa(z);
    var im = pronta(CIMG[c.ic]);
    if (im) {                                          // moeda girando: largura acompanha o giro
      var d = r * 2.3, wv = Math.max(0.12, Math.abs(gir));
      ctx.drawImage(im, x - d * wv / 2, y - d / 2, d * wv, d);
      ctx.globalAlpha = 1; return;
    }
    ctx.fillStyle = 'rgba(61,232,240,.25)'; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 7); ctx.fill();
    ctx.fillStyle = '#3de8f0'; ctx.beginPath(); ctx.ellipse(x, y, Math.max(2, r * Math.abs(gir)), r, 0, 0, 7); ctx.fill();
    if (r > 9 && Math.abs(gir) > 0.5) { ctx.font = Math.round(r * 1.1) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ICON[c.ic], x, y + 1); }
    ctx.globalAlpha = 1;
  }
  function desenhaJet(it) {
    var z = it.z, s = sc(z), x = px(it.lane * LANE, z), y = py(it.y + Math.sin(S.run * 0.5) * 0.18, z), r = 0.6 * s;
    ctx.globalAlpha = nevoa(z);
    var im = pronta('p-' + (it.k || 'jet'));
    if (im) {
      ctx.fillStyle = it.k === 'ima' ? 'rgba(255,80,60,.22)' : it.k === 'escudo' ? 'rgba(61,232,240,.25)' : 'rgba(255,176,59,.25)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
      var d = r * 2.5, ar = im.naturalWidth / im.naturalHeight;
      ctx.drawImage(im, x - d * ar / 2, y - d / 2, d * ar, d);
      ctx.globalAlpha = 1; return;
    }
    ctx.fillStyle = 'rgba(255,176,59,.3)'; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffb03b'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (r > 8) { ctx.font = Math.round(r * 1.15) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚀', x, y + 1); }
    ctx.globalAlpha = 1;
  }
  // Forjabô de costas (formas provisórias até a arte da etapa 2)
  function desenhaJogador() {
    var z = ZP, s = sc(z), x = px(S.x, z), gy = py(0, z), y = py(S.y, z);
    var sl = S.slide > 0, fly = S.jet > 0, ph = S.run * 2.2;
    // sombra no chão
    var k = Math.max(0.35, 1 - S.y / 6);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, gy, 0.8 * s * k, 0.22 * s * k, 0, 0, 7); ctx.fill();
    var tilt = (S.lane * LANE - S.x) * 0.06;
    var nome = S.over ? 'r-tonto' : fly ? 'r-jet' : sl ? 'r-desliza' : S.y > 0.05 ? 'r-pulo' : (Math.floor(S.run * 0.42) % 2 ? 'r-corre-2' : 'r-corre-1');
    var im = pronta(nome);
    if (im) {
      var hh = 2.55 * s * im.naturalHeight / 400 * (sl ? 0.85 : 1), ww = hh * im.naturalWidth / im.naturalHeight;
      var bob = !fly && !sl && S.y <= 0.05 && S.on ? Math.abs(Math.sin(ph)) * 0.07 * s : fly ? Math.sin(S.run * 0.6) * 0.05 * s : 0;
      ctx.save(); ctx.translate(x, y - bob); ctx.rotate(-tilt * 1.4);
      if (fly) { ctx.globalAlpha = 0.85 + Math.random() * 0.15; }
      if (S.inv > 0 && Math.floor(S.inv * 12) % 2) ctx.globalAlpha = 0.35;     // pisca depois que o escudo salvou
      ctx.drawImage(im, -ww / 2, -hh, ww, hh);
      ctx.globalAlpha = 1;
      if (S.escudo) {                                  // bolha do escudo
        var pul = 1 + Math.sin(S.run * 0.3) * 0.03;
        ctx.strokeStyle = 'rgba(61,232,240,.85)'; ctx.lineWidth = Math.max(2, 0.06 * s); ctx.fillStyle = 'rgba(61,232,240,.12)';
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.5, ww * 0.72 * pul, hh * 0.62 * pul, 0, 0, 7); ctx.fill(); ctx.stroke();
      }
      if (S.ima > 0) {                                 // aura do ímã
        ctx.strokeStyle = 'rgba(255,90,70,' + (0.35 + 0.25 * Math.sin(S.run)) + ')'; ctx.lineWidth = Math.max(1.5, 0.04 * s);
        ctx.beginPath(); ctx.arc(0, -hh * 0.55, ww * (0.8 + 0.1 * Math.sin(S.run * 0.7)), 0, 7); ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt);
    var u = s * 1.55;                                   // robô em escala de jogo (mais visível)
    if (sl) {                                          // deslizando: agachado, quase deitado
      ctx.fillStyle = '#7a4b2a'; rr(-0.5 * u, -0.5 * u, u, 0.5 * u, 0.2 * u); ctx.fill();
      ctx.fillStyle = '#b8803f'; rr(-0.42 * u, -0.72 * u, 0.84 * u, 0.4 * u, 0.15 * u); ctx.fill();
      ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.ellipse(0, -0.78 * u, 0.36 * u, 0.24 * u, 0, 0, 7); ctx.fill();
    } else {
      var leg = fly ? 0 : Math.sin(ph) * 0.18 * u, air = S.y > 0.05 && !fly;
      // pernas
      ctx.fillStyle = '#3a3f47';
      rr(-0.3 * u, -0.62 * u + (air ? -0.1 * u : leg), 0.22 * u, 0.62 * u - (air ? 0.15 * u : Math.abs(leg)), 0.08 * u); ctx.fill();
      rr(0.08 * u, -0.62 * u + (air ? -0.1 * u : -leg), 0.22 * u, 0.62 * u - (air ? 0.15 * u : Math.abs(leg)), 0.08 * u); ctx.fill();
      ctx.fillStyle = '#c47a2c'; rr(-0.33 * u, -0.14 * u + (air ? -0.1 * u : leg), 0.28 * u, 0.14 * u, 0.05 * u); ctx.fill(); rr(0.05 * u, -0.14 * u + (air ? -0.1 * u : -leg), 0.28 * u, 0.14 * u, 0.05 * u); ctx.fill();
      // corpo (de costas) + mochila jetpack
      ctx.fillStyle = '#b8803f'; rr(-0.42 * u, -1.25 * u, 0.84 * u, 0.7 * u, 0.18 * u); ctx.fill();
      ctx.fillStyle = '#5e646d'; rr(-0.3 * u, -1.18 * u, 0.6 * u, 0.5 * u, 0.1 * u); ctx.fill();
      ctx.fillStyle = '#3de8f0'; ctx.fillRect(-0.2 * u, -1.05 * u, 0.4 * u, 0.05 * u);
      // braços
      ctx.fillStyle = '#9aa3ad'; var arm = fly ? -0.25 * u : -leg * 0.8;
      rr(-0.6 * u, -1.15 * u + arm, 0.18 * u, 0.5 * u, 0.08 * u); ctx.fill(); rr(0.42 * u, -1.15 * u - arm, 0.18 * u, 0.5 * u, 0.08 * u); ctx.fill();
      // cabeça (nuca) com antena
      ctx.fillStyle = '#a7aeb6'; rr(-0.4 * u, -1.82 * u, 0.8 * u, 0.6 * u, 0.24 * u); ctx.fill();
      ctx.fillStyle = '#7d848d'; rr(-0.4 * u, -1.36 * u, 0.8 * u, 0.12 * u, 0.06 * u); ctx.fill();
      ctx.fillStyle = '#3de8f0'; ctx.beginPath(); ctx.arc(-0.42 * u, -1.52 * u, 0.09 * u, 0, 7); ctx.arc(0.42 * u, -1.52 * u, 0.09 * u, 0, 7); ctx.fill();
      // chama do jetpack
      if (fly) {
        var fl = 0.35 + Math.random() * 0.25;
        ctx.fillStyle = '#ffb03b'; ctx.beginPath(); ctx.moveTo(-0.22 * u, -0.66 * u); ctx.lineTo(-0.1 * u, -0.66 * u); ctx.lineTo(-0.16 * u, (-0.66 + fl) * u); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0.1 * u, -0.66 * u); ctx.lineTo(0.22 * u, -0.66 * u); ctx.lineTo(0.16 * u, (-0.66 + fl) * u); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- abrir / começar / fechar ---------- */
  function mostrarRecorde() {
    var best = 0; try { best = +localStorage.getItem(KEY_BEST) || 0; } catch (_) {}
    telaIni.querySelector('.jg-rec').textContent = best ? '🏆 Seu recorde: ' + best + ' clientes' : '';
  }
  function abrir() {
    root.hidden = false; document.documentElement.classList.add('jg-aberto');
    medir(); novoJogo(); mostrarRecorde();
    telaIni.hidden = false; telaFim.hidden = true; elN.textContent = '0'; elDist.textContent = '';
    last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    setTimeout(function () { telaIni.querySelector('.jg-go').focus({ preventScroll: true }); }, 50);
  }
  function comecar() {
    if (S.paused) { S.paused = false; S.on = true; telaIni.hidden = true; telaIni.querySelector('.jg-go').textContent = 'Toque para jogar'; last = 0; return; }
    novoJogo(); S.on = true; telaIni.hidden = true; telaFim.hidden = true; elN.textContent = '0';
  }
  function fechar() {
    S.on = false; root.hidden = true; document.documentElement.classList.remove('jg-aberto');
    cancelAnimationFrame(raf);
  }
  root.querySelector('.jg-go').addEventListener('click', comecar);
  root.querySelector('.jg-de-novo').addEventListener('click', comecar);
  root.querySelector('.jg-x').addEventListener('click', fechar);
  root.querySelector('.jg-projeto').addEventListener('click', function () { fechar(); if (window.Briefing) window.Briefing.abrir(); });
  window.addEventListener('resize', function () { if (!root.hidden) medir(); });
  document.addEventListener('visibilitychange', function () {   // saiu do app no meio do jogo: pausa
    if (document.hidden && S.on) { S.on = false; S.paused = true; telaIni.hidden = false; telaIni.querySelector('.jg-go').textContent = 'Continuar'; }
  });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-jogo]')) { e.preventDefault(); abrir(); } });
  window.Jogo = { abrir: abrir, fechar: fechar, _estado: function () { return S; }, _obs: obs };
})();
/* no Contato, o Forjabô que passeia pela página some e fica só o da largada */
(function () {
  var c = document.getElementById('contato'); if (!c || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (en) { document.documentElement.classList.toggle('jg-perto', en[0].isIntersecting); }, { threshold: 0.45 }).observe(c);
})();
