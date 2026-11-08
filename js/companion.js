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
  var PM = window.POSES || {};
  // pose de descanso por seção (só poses que fazem sentido sozinhas, sem "apresentar o nada")
  var IDLE = { dor: 'triste', modelos: 'joinha', quem: 'feliz', como: 'apontando', contato: 'danca' };
  var REACT = ['joinha', 'feliz', 'comemorando', 'danca', 'estrela'];
  var WALK = ['andando-1', 'andando-2', 'andando-3', 'andando-4'];
  var ALL = ['triste', 'apontando', 'feliz', 'comemorando', 'joinha', 'danca', 'estrela', 'pensativo', 'agachado', 'escalando', 'teleporte', 'aparecendo', 'jet-subindo', 'jet-voando', 'jet-pousando', 'jet-pairando'].concat(WALK);
  var NOZ = { 'jet-pairando': [[[.16,.61]], [-.12,1]], 'jet-subindo': [[[.16,.6],[.29,.6]], [0,1]], 'jet-voando': [[[.1,.43],[.16,.5]], [-.78,.62]], 'jet-pousando': [[[.15,.4],[.25,.4]], [-.1,1]] };
  var LABELS = ['A dor', 'Modelos', 'Quem sou', 'Como', 'Contato'];
  var mq = window.matchMedia ? matchMedia('(hover:none),(max-width:720px)') : { matches: false };

  var box = document.createElement('div');
  box.className = 'buddy'; box.setAttribute('aria-hidden', 'true');
  // cada pose tem altura própria (altura 560 = em pé) e é ancorada pelo corpo, como na rua
  box.innerHTML = '<div class="b-hop"><div class="b-flip"><i class="b-fl"></i><i class="b-fl"></i>' + ALL.map(function (p) {
    var m = PM[p], st = m ? ' style="height:' + (m[1] / 560 * 100).toFixed(1) + '%;transform:translateX(' + (-m[2] * 100).toFixed(1) + '%)"' : '';
    return '<img data-p="' + p + '"' + st + ' src="' + IMG(p) + '" alt="" draggable="false">';
  }).join('') + '</div></div>';

  // pista de progresso (celular): o robozinho anda sobre ela conforme você rola a página
  var track = document.createElement('div');
  track.className = 'ptrack'; track.setAttribute('aria-hidden', 'true');
  track.innerHTML = '<div class="pt-line"><i class="pt-fill"></i></div>' + ids.map(function (id, i) {
    return '<button type="button" class="pt-dot" data-i="' + i + '" tabindex="-1"><i></i><span>' + LABELS[i] + '</span></button>';
  }).join('');
  document.body.appendChild(track);
  var tog = document.createElement('button');
  tog.type = 'button'; tog.className = 'buddy-toggle'; tog.textContent = 'Ocultar robô';
  tog.setAttribute('aria-pressed', 'false'); tog.style.display = 'none';
  document.body.appendChild(box); document.body.appendChild(tog);

  var hop = box.querySelector('.b-hop'), flip = box.querySelector('.b-flip'), fls = box.querySelectorAll('.b-fl');
  function flame(on, p, pw) {                 // chama do jetpack presa ao bocal de cada pose de voo
    var nz = NOZ[p], m = PM[p];
    for (var i = 0; i < fls.length; i++) {
      var f = fls[i];
      if (!on || !nz || !m || !nz[0][i]) { f.style.opacity = 0; continue; }
      var bh = box.offsetHeight, bw = box.offsetWidth, ih = bh * m[1] / 560, iw = ih * m[0] / m[1];
      var gx = bw / 2 - m[2] * iw, gy = bh - 2 - ih, w = ih * 0.1, h = ih * (0.26 + 0.2 * pw), th = Math.atan2(-nz[1][0], nz[1][1]) * 180 / Math.PI;
      f.style.cssText = 'opacity:1;left:' + (gx + nz[0][i][0] * iw - w / 2).toFixed(1) + 'px;top:' + (gy + nz[0][i][1] * ih).toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;transform:rotate(' + th.toFixed(1) + 'deg)';
    }
  }
  var imgs = {}; [].forEach.call(box.querySelectorAll('img'), function (im) {
    imgs[im.dataset.p] = im;
  });

  var hidden = false, shown = false, curSec = null, pose = '', dirFace = 1,
      pos = 0, x = 0, y = 0, offY = 0,             // pos: onde ele quer estar (px da esquerda); x: onde está desenhado; y/offY: altura (px acima do rodapé)
      bounce = 1, pend = 0, parked = false, parkedScroll = 0, dirTravel = 1, lastSY = window.scrollY,
      vx = 0, lastT = 0, lastScrollT = 0, walkT = 0, walkF = 0, walking = false, stillT = 0,
      reactUntil = 0, reactI = 0, drag = null, leap = null, arc = 0,
      fastDir = 0, fastCool = 0, lastSyT = 0, idleW = 0, wanderIn = 5;
  var mini = false, mf = 0, mfT = 0, mWalkD = 0, mStill = 0, mSecShown = -1, mLastX = 0, dotsX = [], trackL = 0, trackW = 0;

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

  // ---- movimentos: pular, voar com o jetpack, teleportar, escalar e pular por cima ----
  var lastMove = '';
  function pickMove(dist) {
    var r = Math.random(), t;
    if (dist > 900) t = r < 0.45 ? 'jet' : (r < 0.7 ? 'tele' : 'jump');
    else if (dist > 300) t = r < 0.4 ? 'jump' : (r < 0.75 ? 'jet' : 'climb');
    else t = r < 0.5 ? 'jump' : (r < 0.8 ? 'climb' : 'jet');
    if (t === lastMove) t = t === 'jump' ? 'jet' : 'jump';
    return lastMove = t;
  }
  function startMove(type, x1) {
    var dist = Math.abs(x1 - x), dur = type === 'jump' ? clamp(dist / 900, 0.5, 0.9) + 0.36 : type === 'jet' ? clamp(dist / 650, 0.7, 1.5) + 0.7 : type === 'tele' ? 1.0 : 0.85 + clamp(dist / 900, 0.5, 0.8) + 0.22;
    leap = { type: type, x0: x, x1: x1, t: 0, dur: dur, dir: x1 >= x ? 1 : -1, dist: dist };
    reactUntil = 0; walking = false;
  }
  function ez(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function airP(p) { return p < 0.22 || p > 0.74 ? 'comemorando' : 'estrela'; }
  function stepMove(d, ty, dt) {              // devolve a nova posição/altura/pose do movimento em curso
    var L = leap, t = L.t, D = L.dur, a = L.x1;
    flip.style.transform = 'scaleX(' + L.dir + ')'; flip.style.opacity = 1; arc = 0; flame(false);
    if (L.type === 'jump') {
      var an = 0.14, ld = 0.22, fl = D - an - ld;
      if (t < an) { setPose('agachado'); x = L.x0; }
      else if (t < an + fl) {
        var p = (t - an) / fl, H = clamp(L.dist * 0.16 + 80, 90, 170);
        x = L.x0 + (a - L.x0) * ez(p); arc = 4 * H * p * (1 - p); setPose(airP(p));
      } else { x = a; setPose('agachado'); }
    } else if (L.type === 'jet') {
      var up = 0.26 * D, dn = 0.28 * D, hh = clamp(d.h * 0.85, 90, 190);
      if (t < up) { var q = t / up; x = L.x0; arc = hh * q * (2 - q); setPose('jet-subindo'); flame(true, 'jet-subindo', 1); }
      else if (t < D - dn) { var c = (t - up) / (D - up - dn); x = L.x0 + (a - L.x0) * ez(c); arc = hh + 6 * Math.sin(c * 9); setPose('jet-voando'); flame(true, 'jet-voando', 1); }
      else if (t < D - 0.12) { var r2 = (t - (D - dn)) / (dn - 0.12); x = a; arc = hh * (1 - ez(r2)); setPose('jet-pousando'); flame(true, 'jet-pousando', 0.7 * (1 - r2) + 0.3); }
      else { x = a; setPose('agachado'); }
    } else if (L.type === 'tele') {
      if (t < 0.45) { x = L.x0; setPose('teleporte'); flip.style.opacity = Math.max(0, 1 - t / 0.45).toFixed(2); }
      else { x = a; setPose('aparecendo'); flip.style.opacity = Math.min(1, (t - 0.45) / 0.4).toFixed(2); }
    } else {                                   // escalar: sobe pela borda e pula por cima
      var cl = 0.85, jm = D - cl - 0.22;
      if (t < cl) { var q2 = t / cl; x = L.x0 + L.dir * 6 * q2; arc = 120 * (1 - Math.pow(1 - q2, 2)); setPose('escalando'); }
      else if (t < cl + jm) { var p3 = (t - cl) / jm; x = L.x0 + L.dir * 6 + (a - L.x0 - L.dir * 6) * ez(p3); arc = 120 * (1 - p3) + 4 * 50 * p3 * (1 - p3); setPose(airP(p3)); }
      else { x = a; setPose('agachado'); }
    }
    arc = Math.min(arc, Math.max(0, d.maxY - y));
    y += (ty - y) * (1 - Math.exp(-dt * 8));
    if (L.t >= D) { leap = null; arc = 0; flip.style.opacity = 1; flame(false); flip.style.transform = 'scaleX(1)'; setPose(IDLE[curSec] || 'feliz'); hopNow(); }
  }

  // ---- modo celular: mini robô sobre a pista de progresso ----
  function layoutTrack() {
    var W = window.innerWidth, m = Math.max(34, W * 0.1);
    trackL = m; trackW = W - 2 * m; dotsX = ids.map(function (_, i) { return m + trackW * i / (ids.length - 1); });
    var dots = track.querySelectorAll('.pt-dot');
    for (var i = 0; i < dots.length; i++) dots[i].style.left = dotsX[i].toFixed(1) + 'px';
  }
  function progress() {          // 0..4: em que ponto do caminho entre as 5 seções a tela está
    var ref = window.innerHeight * 0.5, tops = secs.map(function (e) { return e.getBoundingClientRect().top - ref; }), i = -1;
    for (var k = 0; k < tops.length; k++) if (tops[k] <= 0) i = k;
    if (i < 0) return 0;
    if (i >= tops.length - 1) return tops.length - 1;
    var span = tops[i + 1] - tops[i];
    return i + clamp(-tops[i] / (span || 1), 0, 1);
  }
  function trackX(f) {
    var i = Math.min(ids.length - 2, Math.floor(f)), t = f - i;
    return dotsX[i] + (dotsX[i + 1] - dotsX[i]) * t;
  }
  function setMode() {
    var m = !!mq.matches;
    if (m === mini) return;
    mini = m; box.classList.toggle('mini', mini); track.classList.toggle('on', mini && shown); document.body.classList.toggle('mini-on', mini);
    walking = false; leap = null; drag = null; box.classList.remove('dragging'); flip.style.transform = 'scaleX(1)'; flip.style.opacity = 1; flame(false);
    if (mini) { layoutTrack(); mf = progress(); x = trackX(mf) - 23; mLastX = x; setPose(IDLE[curSec] || 'feliz'); }
    else { var d = dims(); pos = d.m; x = pos; y = 0; offY = 0; parked = false; }
  }
  function paintTrack(f, cx) {
    var dots = track.querySelectorAll('.pt-dot'), near = Math.round(f);
    for (var i = 0; i < dots.length; i++) { dots[i].classList.toggle('past', i <= f + 0.05); dots[i].classList.toggle('here', i === near && Math.abs(f - near) < 0.12); }
    track.querySelector('.pt-fill').style.width = Math.max(0, cx - trackL + 6).toFixed(1) + 'px';
  }
  track.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.pt-dot'); if (!b) return;
    var t = secs[+b.dataset.i]; if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  });
  track.querySelectorAll('.pt-dot').forEach(function (b) { b.tabIndex = -1; });

  function onScroll() {
    var now = performance.now(); lastScrollT = now;
    var sy = window.scrollY, dy = sy - lastSY; lastSY = sy;
    var sdt = now - lastSyT; lastSyT = now;
    if (dy && sdt > 0 && sdt < 200 && Math.abs(dy) / sdt * 1000 > 2200 && now > fastCool) { fastDir = dy > 0 ? 1 : -1; fastCool = now + 2500; }   // rolagem rápida: ele acompanha voando
    if (dy) dirTravel = dy > 0 ? 1 : -1;
    if (window.INTRO_OPEN) return;
    var inHero = inHeroZone();
    tog.style.display = inHero ? 'none' : 'block';
    var visible = !inHero && !hidden;
    setMode();
    if (visible !== shown) {
      shown = visible; box.classList.toggle('show', shown); track.classList.toggle('on', mini && shown);
      if (shown) {                                   // sempre entra pelo canto esquerdo
        var d = dims(); pos = d.m; x = d.m; y = offY; bounce = 1; pend = 0; parked = false; leap = null; flip.style.opacity = 1; flame(false); dirFace = 1;
        if (!mini && !RM) { leap = { type: 'tele', x0: x, x1: x, t: 0.45, dur: 1.0, dir: 1, dist: 0 }; flip.style.opacity = 0; }   // aparece na tela, sem entrar pelo canto
        if (mini) { layoutTrack(); mfT = progress(); x = -30; mLastX = x; mSecShown = -1; }
        setPose(IDLE[curSec] || 'triste');
      }
      return;
    }
    if (mini) { mfT = progress(); }
    if (shown) { pend += dy; if (parked) { parkedScroll += Math.abs(dy); } }
    var sec = sectionAt();
    if (sec && sec !== curSec) curSec = sec;         // a pose nova só entra quando ele para de andar
  }

  function miniLoop(now, dt) {
    if (!trackW) layoutTrack();
    var tx = trackX(mfT) - 23, px = x;
    x += (tx - x) * (1 - Math.exp(-dt * 8));
    var dx = x - px, v = dt ? dx / dt : 0, moving = Math.abs(v) > 14;
    if (moving && !RM) {
      mStill = 0; walking = true; mWalkD += Math.abs(dx); dirFace = v > 0 ? 1 : -1;
      if (now > reactUntil) setPose(WALK[Math.floor(mWalkD / 10) % 4]);
      flip.style.transform = 'scaleX(' + dirFace + ')';
    } else {
      mStill += dt;
      if (walking && mStill > 0.3) {                                   // parou: pose da seção + um pulinho
        walking = false; flip.style.transform = 'scaleX(1)';
        if (now > reactUntil) { setPose(IDLE[curSec] || 'feliz'); hopNow(); }
      }
      if (!walking && reactUntil && now > reactUntil) { reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); }
    }
    box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    paintTrack(mfT, x + 23);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    if (!shown) return;
    if (mq.matches !== mini) setMode();
    if (mini) { miniLoop(now, dt); return; }
    var d = dims(), off = d.w * 0.12, bw = d.w * 0.76, vw = window.innerWidth;
    var ty = clamp(offY, 0, d.maxY);
    var iv = obstacles(window.innerHeight - d.h - y, window.innerHeight - y);
    function hit(L) { for (var i = 0; i < iv.length; i++) if (L + off < iv[i][1] && L + off + bw > iv[i][0]) return iv[i]; return null; }
    var dragging = drag && drag.moved, heading = 0, px = x;
    function clearFrom(L, dir) { var I, n = 0; while ((I = hit(L)) && n++ < 10) L = dir > 0 ? I[1] - off : I[0] - off - bw; return (!I && L >= 0 && L <= d.maxX) ? L : null; }
    function freeSpot(minDist, pref) {                       // escolhe um ponto livre da tela para ir
      var c = [], n = 14, i, L;
      for (i = 0; i <= n; i++) { L = d.m + (d.maxX - d.m) * i / n; if (!hit(L) && Math.abs(L - x) >= minDist) c.push(L); }
      if (pref) { var pf = c.filter(function (v) { return (v - x) * pref > 0; }); if (pf.length) c = pf; }
      return c.length ? c[Math.floor(Math.random() * c.length)] : null;
    }

    if (!dragging) {
      var inside = !!hit(pos);
      if (parked && (!inside || parkedScroll > 700)) { parked = false; parkedScroll = 0; }
      // 1) algo apareceu embaixo dele (a página rolou): passa para o outro lado
      if (inside && !parked) {
        var go = function (dir) { var L = pos, I, n = 0; while ((I = hit(L)) && n++ < 10) L = dir > 0 ? I[1] - off : I[0] - off - bw; return (!I && L >= 0 && L <= d.maxX) ? L : null; };
        var a = go(dirTravel), b = go(-dirTravel), np = a !== null ? a : b;
        if (a !== null && b !== null && Math.abs(a - pos) > 2.5 * Math.abs(b - pos) && Math.abs(a - pos) > 420) np = b;
        if (np !== null) {
          if (!RM && Math.abs(np - x) > d.w * 1.6 && !leap) startMove(pickMove(Math.abs(np - x)), np);
          pos = np;
        }
      }
      // 2) anda conforme a rolagem; bate no limite do conteúdo e volta
      if (pend && !RM) {
        heading = (pend > 0 ? 1 : -1) * bounce;
        var rem = Math.abs(pend) * (vw < 700 ? 0.3 : 0.8), n2 = 0; pend = 0;
        var tgt;
        while (rem > 0.5 && n2++ < 3) {
          var bl = pos + off, br = bl + bw, lim = null, free = !hit(pos);
          if (free) {
            if (heading > 0) iv.forEach(function (i) { if (i[0] >= br - 0.5 && i[0] < br + rem && (lim === null || i[0] < lim)) lim = i[0]; });
            else iv.forEach(function (i) { if (i[1] <= bl + 0.5 && i[1] > bl - rem && (lim === null || i[1] > lim)) lim = i[1]; });
          }
          if (lim === null) {
            var npx = pos + heading * rem; rem = 0;
            if (npx < 0 || npx > d.maxX) { npx = clamp(npx, 0, d.maxX); bounce = -bounce; dirFace = -dirFace; }   // chegou ao limite da tela: para ali
            pos = npx;
          }
          else if (!RM && !leap && (tgt = clearFrom(heading > 0 ? lim - off - bw + 2 : lim - off - 2, heading)) !== null && Math.abs(tgt - x) > 8) {
            startMove(pickMove(Math.abs(tgt - x)), tgt); pos = tgt; rem = 0;      // obstáculo na frente: passa por cima (pula, escala ou voa)
          }
          else {
            var np2 = heading > 0 ? lim - off - bw : lim - off;
            rem -= Math.abs(np2 - pos); pos = np2; bounce = -bounce; heading = -heading; dirFace = heading;
          }
        }
        pos = clamp(pos, 0, d.maxX);
      }
      pos = clamp(pos, 0, d.maxX);                           // fica sempre dentro da página
      // 4) rolagem rápida: voa (jetpack) ou teleporta para outro ponto da tela
      if (fastDir) {
        if (!RM && !leap && !parked && !drag) { var fr = Math.random(), ft = fr < 0.7 ? freeSpot(350, fastDir) : null; if (ft !== null) { startMove(fr < 0.3 ? 'tele' : fr < 0.55 ? 'jet' : 'jump', ft); pos = ft; pend = 0; } }
        fastDir = 0;
      }
    }

    if (dragging) { x = pos; y = ty; arc = 0; leap = null; }
    else if (RM) { pos = clamp(pos, 0, d.maxX); x = pos; y = ty; }
    else if (leap) {
      leap.t += dt; leap.x1 = pos; idleW = 0;
      stepMove(d, ty, dt);
    } else {
      var dx = pos - x, step = dx * (1 - Math.exp(-dt * 6)), cap = 760 * dt;
      x += clamp(step, -cap, cap); y += (ty - y) * (1 - Math.exp(-dt * 8)); arc = 0;
    }
    vx = dt ? (x - px) / dt : 0;

    // andando = está se movendo; a animação é por tempo
    var moving = !drag && !leap && Math.abs(vx) > 28;
    if (Math.abs(vx) > 28) dirFace = vx > 0 ? 1 : -1;
    if (moving && !RM) {
      stillT = 0; idleW = 0;
      if (!walking) { walking = true; walkT = 0; }
      walkT += dt;
      if (walkT > 0.12) { walkT = 0; walkF = (walkF + 1) % 4; }
      if (now > reactUntil) setPose(WALK[walkF]);
      flip.style.transform = 'scaleX(' + dirFace + ')';
    } else if (!leap) {
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
    if (mini) return;                       // no celular o robozinho fica na pista: toque = reação
    var dx = e.clientX - drag.px, dy = e.clientY - drag.py, d = dims();
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; box.classList.add('dragging'); walking = false; leap = null; flame(false); flip.style.opacity = 1; flip.style.transform = 'scaleX(1)'; reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); }
    pos = clamp(drag.ox + dx, 0, d.maxX); offY = clamp(drag.oy - dy, 0, d.maxY);
    e.preventDefault();
  });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var moved = drag.moved; drag = null; box.classList.remove('dragging');
    var now = performance.now();
    if (moved) { parked = true; parkedScroll = 0; reactUntil = 0; setPose(IDLE[curSec] || 'feliz'); hopNow(); }   // onde você soltar, ele fica
    else if (!mini && !RM && !leap) { var tp = ['jump', 'jet', 'tele', 'jump'][reactI++ % 4]; startMove(tp, x); }
    else { reactI = (reactI + 1) % REACT.length; setPose(REACT[reactI]); reactUntil = now + 1800; hopNow(); }
  }
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('dblclick', function () { if (mini) return; var d = dims(); offY = 0; parked = false; bounce = 1; pos = d.m; });

  tog.addEventListener('click', function () {
    hidden = !hidden; tog.setAttribute('aria-pressed', String(hidden));
    tog.textContent = hidden ? 'Mostrar robô' : 'Ocultar robô';
    shown = false; box.classList.remove('show'); onScroll();
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { if (mini) layoutTrack(); setMode(); var d = dims(); y = clamp(y, 0, d.maxY); offY = clamp(offY, 0, d.maxY); pos = clamp(pos, -d.w, window.innerWidth); });
  window.addEventListener('intro-end', function () { onScroll(); });
  setPose('triste'); setMode(); onScroll(); requestAnimationFrame(loop);
})();
