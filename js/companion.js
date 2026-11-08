/* Robô companheiro: acompanha a rolagem depois da rua, anda de verdade (velocidade limitada), reage por seção,
   pula e pode ser arrastado para qualquer ponto da tela (cima, baixo, lados). Duplo clique volta ao caminho. */
(function () {
  'use strict';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.getElementById('hero');
  var ids = ['dor', 'modelos', 'quem', 'como', 'contato'];
  var secs = ids.map(function (i) { return document.getElementById(i); });
  if (!hero || secs.some(function (s) { return !s; })) return;

  var IMG = function (n) { return 'assets/img/robo-' + n + '.webp'; };
  // pose de descanso por seção (só poses que fazem sentido sozinhas, sem "apresentar o nada")
  var IDLE = { dor: 'triste', modelos: 'feliz', quem: 'acenando', como: 'feliz', contato: 'comemorando' };
  var REACT = ['feliz', 'acenando', 'comemorando'];
  var WALK = ['andando-1', 'andando-2', 'andando-3', 'andando-4'];
  var ALL = ['triste', 'apontando', 'acenando', 'feliz', 'comemorando', 'surpreso'].concat(WALK);

  var box = document.createElement('div');
  box.className = 'buddy'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<div class="b-hop"><div class="b-flip">' + ALL.map(function (p) {
    return '<img data-p="' + p + '" src="' + IMG(p) + '" alt="" draggable="false">';
  }).join('') + '</div></div>';
  var tog = document.createElement('button');
  tog.type = 'button'; tog.className = 'buddy-toggle'; tog.textContent = 'Ocultar robô';
  tog.setAttribute('aria-pressed', 'false'); tog.style.display = 'none';
  document.body.appendChild(box); document.body.appendChild(tog);

  var hop = box.querySelector('.b-hop'), flip = box.querySelector('.b-flip');
  var imgs = {}; [].forEach.call(box.querySelectorAll('img'), function (im) {
    imgs[im.dataset.p] = im;
    im.addEventListener('error', function () { if (im.dataset.p === 'acenando') { im.src = IMG('feliz'); } });
  });

  var hidden = false, shown = false, curSec = null, pose = '', dirFace = 1,
      pos = 0, x = 0, y = 0, offY = 0,             // pos: onde ele quer estar (px da esquerda); x: onde está desenhado; y/offY: altura (px acima do rodapé)
      bounce = 1, pend = 0, parked = false, parkedScroll = 0, dirTravel = 1, lastSY = window.scrollY,
      vx = 0, lastT = 0, lastScrollT = 0, walkT = 0, walkF = 0, walking = false, stillT = 0,
      reactUntil = 0, reactI = 0, drag = null, leap = null, arc = 0;

  function setPose(p) {
    if (p === pose) return; pose = p;
    for (var k in imgs) imgs[k].classList.toggle('on', k === p);
  }
  function hopNow() {
    if (RM) return;
    hop.classList.remove('hopping'); void hop.offsetWidth; hop.classList.add('hopping');
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function dims() {
    var w = box.offsetWidth || 120, h = box.offsetHeight || 150, m = Math.max(8, window.innerWidth * 0.025);
    return { w: w, h: h, m: m, maxX: Math.max(0, window.innerWidth - w), maxY: Math.max(0, window.innerHeight - h - 8) };
  }
  function sectionAt() {
    var mid = window.innerHeight * 0.55, cur = null;
    for (var i = 0; i < secs.length; i++) { var r = secs[i].getBoundingClientRect(); if (r.top <= mid) cur = ids[i]; }
    return cur;
  }
  function inHeroZone() { var r = hero.getBoundingClientRect(); return r.bottom > window.innerHeight * 0.55; }

  // ---- obstáculos: texto, cartão, foto, botão. Ele só anda no espaço livre ao lado deles ----
  var OBST = 'main h2, main p, main .trio article, main .steps li, main .card, main .photo, main .btn, footer a, footer p';
  function obstacles(top, bottom) {
    var out = [], list = document.querySelectorAll(OBST);
    for (var i = 0; i < list.length; i++) {
      var el = list[i], r;
      if ((el.tagName === 'H2' || el.tagName === 'P') && el.closest('article,li,.card')) continue;   // o cartão já cobre
      if (el.tagName === 'H2' || el.tagName === 'P' || el.tagName === 'A' && !el.classList.contains('btn')) {
        var rg = document.createRange(); rg.selectNodeContents(el); r = rg.getBoundingClientRect();    // largura real do texto
      } else r = el.getBoundingClientRect();
      if (r.width < 2 || r.bottom < top + 14 || r.top > bottom - 14) continue;
      out.push([r.left, r.right]);
    }
    out.sort(function (a, b) { return a[0] - b[0]; });
    var m = [];
    out.forEach(function (it) { var l = m[m.length - 1]; if (l && it[0] <= l[1]) { l[1] = Math.max(l[1], it[1]); } else m.push([it[0], it[1]]); });
    return m.map(function (a) { return [a[0] - 14, a[1] + 14]; });
  }

  function onScroll() {
    var now = performance.now(); lastScrollT = now;
    var sy = window.scrollY, dy = sy - lastSY; lastSY = sy;
    if (dy) dirTravel = dy > 0 ? 1 : -1;
    if (window.INTRO_OPEN) return;
    var inHero = inHeroZone();
    tog.style.display = inHero ? 'none' : 'block';
    var visible = !inHero && !hidden;
    if (visible !== shown) {
      shown = visible; box.classList.toggle('show', shown);
      if (shown) {                                   // sempre entra pelo canto esquerdo
        var d = dims(); pos = d.m; x = -d.w - 4; y = offY; bounce = 1; pend = 0; parked = false; leap = null; dirFace = 1;
        setPose(IDLE[curSec] || 'triste');
      }
      return;
    }
    if (shown) { pend += dy; if (parked) { parkedScroll += Math.abs(dy); } }
    var sec = sectionAt();
    if (sec && sec !== curSec) curSec = sec;         // a pose nova só entra quando ele para de andar
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    if (!shown) return;
    var d = dims(), off = d.w * 0.12, bw = d.w * 0.76, vw = window.innerWidth;
    var ty = clamp(offY, 0, d.maxY);
    var iv = obstacles(window.innerHeight - d.h - y, window.innerHeight - y);
    function hit(L) { for (var i = 0; i < iv.length; i++) if (L + off < iv[i][1] && L + off + bw > iv[i][0]) return iv[i]; return null; }
    var dragging = drag && drag.moved, heading = 0, px = x;

    if (!dragging) {
      var inside = !!hit(pos);
      if (parked && (!inside || parkedScroll > 700)) { parked = false; parkedScroll = 0; }
      // 1) algo apareceu embaixo dele (a página rolou): passa para o outro lado
      if (inside && !parked && pos > -d.w * 0.5 && pos < vw - d.w * 0.5) {
        var go = function (dir) { var L = pos, I, n = 0; while ((I = hit(L)) && n++ < 10) L = dir > 0 ? I[1] - off : I[0] - off - bw; return (!I && L >= -off && L <= d.maxX) ? L : null; };
        var a = go(dirTravel), b = go(-dirTravel), np = a !== null ? a : b;
        if (a !== null && b !== null && Math.abs(a - pos) > 2.5 * Math.abs(b - pos) && Math.abs(a - pos) > 420) np = b;
        if (np !== null) {
          if (!RM && Math.abs(np - x) > d.w * 1.6 && !leap) leap = { x0: x, t: 0, dur: clamp(Math.abs(np - x) / 1100, 0.4, 0.75) };
          pos = np;
        }
      }
      // 2) anda conforme a rolagem; bate no limite do conteúdo e volta
      if (pend && !RM) {
        heading = (pend > 0 ? 1 : -1) * bounce;
        var rem = Math.abs(pend) * (vw < 700 ? 0.3 : 0.8), n2 = 0; pend = 0;
        while (rem > 0.5 && n2++ < 3) {
          var bl = pos + off, br = bl + bw, lim = null, free = !hit(pos);
          if (free) {
            if (heading > 0) iv.forEach(function (i) { if (i[0] >= br - 0.5 && i[0] < br + rem && (lim === null || i[0] < lim)) lim = i[0]; });
            else iv.forEach(function (i) { if (i[1] <= bl + 0.5 && i[1] > bl - rem && (lim === null || i[1] > lim)) lim = i[1]; });
          }
          if (lim === null) { pos += heading * rem; rem = 0; }
          else {
            var np2 = heading > 0 ? lim - off - bw : lim - off;
            rem -= Math.abs(np2 - pos); pos = np2; bounce = -bounce; heading = -heading; dirFace = heading;
          }
        }
        pos = clamp(pos, -d.w - 80, vw + 80);
      }
      // 3) saiu por um lado da tela: reaparece pelo outro
      if (!leap && x < -d.w + 2 && pos < x) { x = vw + 2; pos = vw - 10; }            // saiu pela esquerda, entra pela direita
      else if (!leap && x > vw - 2 && pos > x) { x = -d.w - 2; pos = -d.w + 10; }     // saiu pela direita, entra pela esquerda
    }

    if (dragging) { x = pos; y = ty; arc = 0; leap = null; }
    else if (RM) { pos = clamp(pos, 0, d.maxX); x = pos; y = ty; }
    else if (leap) {
      leap.t += dt / leap.dur; var k = Math.min(1, leap.t), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      x = leap.x0 + (pos - leap.x0) * e; y += (ty - y) * (1 - Math.exp(-dt * 8)); arc = Math.sin(Math.PI * k) * Math.min(130, d.h * 0.8);
      if (k >= 1) { leap = null; arc = 0; }
    } else {
      var dx = pos - x, step = dx * (1 - Math.exp(-dt * 6)), cap = 760 * dt;
      x += clamp(step, -cap, cap); y += (ty - y) * (1 - Math.exp(-dt * 8)); arc = 0;
    }
    vx = dt ? (x - px) / dt : 0;

    // andando = está se movendo; a animação é por tempo
    var moving = !drag && (leap || Math.abs(vx) > 28);
    if (Math.abs(vx) > 28) dirFace = vx > 0 ? 1 : -1;
    if (moving && !RM) {
      stillT = 0;
      if (!walking) { walking = true; walkT = 0; }
      walkT += dt;
      if (walkT > 0.12) { walkT = 0; walkF = (walkF + 1) % 4; }
      if (now > reactUntil) setPose(leap ? 'feliz' : WALK[walkF]);
      flip.style.transform = 'scaleX(' + dirFace + ')';
    } else {
      stillT += dt;
      if (walking && stillT > 0.3) {                                   // parou: pose da seção + um pulinho
        walking = false; flip.style.transform = 'scaleX(1)';
        if (now > reactUntil) { setPose(IDLE[curSec] || 'feliz'); hopNow(); }
      }
      if (!walking && !drag && reactUntil && now > reactUntil) { reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); }
    }
    box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (-(y + arc)).toFixed(1) + 'px,0)';
  }

  // arrastar para qualquer lugar; clique = reação; duplo clique = volta ao canto
  box.addEventListener('pointerdown', function (e) {
    drag = { px: e.clientX, py: e.clientY, ox: x, oy: y, moved: false, id: e.pointerId };
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
  });
  box.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.px, dy = e.clientY - drag.py, d = dims();
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; box.classList.add('dragging'); walking = false; leap = null; flip.style.transform = 'scaleX(1)'; reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); }
    pos = clamp(drag.ox + dx, 0, d.maxX); offY = clamp(drag.oy - dy, 0, d.maxY);
    e.preventDefault();
  });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var moved = drag.moved; drag = null; box.classList.remove('dragging');
    var now = performance.now();
    if (moved) { parked = true; parkedScroll = 0; reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); hopNow(); }   // onde você soltar, ele fica
    else { reactI = (reactI + 1) % REACT.length; setPose(REACT[reactI]); reactUntil = now + 1800; hopNow(); }
  }
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('dblclick', function () { var d = dims(); offY = 0; parked = false; bounce = 1; pos = d.m; });

  tog.addEventListener('click', function () {
    hidden = !hidden; tog.setAttribute('aria-pressed', String(hidden));
    tog.textContent = hidden ? 'Mostrar robô' : 'Ocultar robô';
    shown = false; box.classList.remove('show'); onScroll();
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { var d = dims(); y = clamp(y, 0, d.maxY); offY = clamp(offY, 0, d.maxY); pos = clamp(pos, -d.w, window.innerWidth); });
  window.addEventListener('intro-end', function () { onScroll(); });
  setPose('triste'); onScroll(); requestAnimationFrame(loop);
})();
