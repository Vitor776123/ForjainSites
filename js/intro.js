/* Abertura: tela "Começar" sobre a rua animada, depois uma cena curta que ensina o jogo. */
(function () {
  'use strict';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (/[?&]semintro\b/.test(location.search)) return;
  window.INTRO_OPEN = true;
  var IMG = function (n) { return 'assets/img/' + n + '.webp'; };
  var root = document.createElement('div');
  root.id = 'intro'; root.className = 'intro start';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Introdução');

  var poses = ['triste', 'surpreso', 'feliz', 'comemorando', 'andando-1', 'andando-2', 'andando-3', 'andando-4'];
  var poseImgs = poses.map(function (p) { return '<img data-p="' + p + '" src="' + IMG('robo-' + p) + '" alt="" draggable="false">'; }).join('');
  var predios = [['predio-01', 1], ['predio-03', 24], ['predio-02', 47], ['predio-04', 68], ['predio-06', 84]]
    .map(function (b) { return '<img class="sc-pred" style="left:' + b[1] + '%" src="' + IMG(b[0]) + '" alt="" draggable="false">'; }).join('');

  root.innerHTML =
    '<div class="in-card">' +
      '<p class="in-eyebrow">Forja de in<b>SITES</b></p>' +
      '<h2 class="in-title">Veja o que um site muda no seu comércio.</h2>' +
      '<p class="in-sub">Um passeio rápido, depois a rua é sua.</p>' +
      '<button type="button" class="in-go">Começar <span aria-hidden="true">→</span></button>' +
    '</div>' +
    '<div class="in-scene" aria-hidden="true" data-step="0">' +
      '<div class="sc-sky"></div>' + predios +
      '<div class="sc-walk"></div><div class="sc-road"></div>' +
      '<img class="sc-shop sc-shop-b" src="' + IMG('loja-padaria') + '" alt="" draggable="false">' +
      '<img class="sc-shop sc-shop-a" src="' + IMG('loja-adega') + '" alt="" draggable="false">' +
      '<div class="sc-chip">&#10003; Site no ar</div>' +
      '<div class="sc-win"><div class="w-bar"><i></i><i></i><i></i></div><div class="w-body"><span class="w-ok">&#10003;</span><b>Pedido feito!</b><small>Vinho &amp; Prosa</small></div></div>' +
      '<div class="sc-robot" data-pose="triste">' + poseImgs +
        '<div class="sc-err"><div class="w-bar"><i></i><i></i><i></i></div><div class="w-body"><span class="w-x">&#10005;</span><b>Site indisponível</b></div></div>' +
      '</div>' +
      '<div class="sc-confetti"></div>' +
      '<p class="sc-cap" aria-live="polite"></p>' +
    '</div>' +
    '<div class="in-film" aria-hidden="true"><div class="film-stage">' +
      '<video class="film-vid" playsinline preload="auto" poster="assets/video/intro-poster.jpg" src="assets/video/intro.mp4"></video>' +
      '<div class="film-err"><div class="fe-bar"><i></i><i></i><i></i></div><div class="fe-body"><span class="fe-x">&#10005;</span><b>Site indisponível ainda</b><small>Esta loja ainda não tem site.</small></div></div>' +
    '</div><p class="sc-cap film-cap" aria-live="polite"></p><div class="film-flash"></div></div>' +
    '<button type="button" class="in-sound" aria-pressed="false">Som: ligado</button>' +
    '<button type="button" class="in-skip">Pular</button>';
  document.body.appendChild(root);

  var scene = root.querySelector('.in-scene'), robot = root.querySelector('.sc-robot'),
      cap = root.querySelector('.sc-cap'), go = root.querySelector('.in-go'), skip = root.querySelector('.in-skip'),
      conf = root.querySelector('.sc-confetti'), vid = root.querySelector('.film-vid'), fcap = root.querySelector('.film-cap'),
      ferr = root.querySelector('.film-err'), fflash = root.querySelector('.film-flash'), snd = root.querySelector('.in-sound');
  var timers = [], walkIv = 0, ended = false;
  var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
  var pose = function (p) { robot.dataset.pose = p; };
  var say = function (t) { cap.classList.remove('on'); setTimeout(function () { cap.textContent = t; cap.classList.add('on'); }, 160); };
  var step = function (n) { scene.dataset.step = n; };
  setTimeout(function () { go.focus({ preventScroll: true }); }, 50);

  function finish() {
    if (ended) return; ended = true;
    timers.forEach(clearTimeout); clearInterval(walkIv); filmOn = false; try { vid.pause(); } catch (_) {}
    root.classList.add('out');
    setTimeout(function () {
      root.remove(); window.INTRO_OPEN = false;
      window.dispatchEvent(new Event('intro-end'));
    }, 520);
  }
  function burst() {
    var cols = ['#3DE8F0', '#FFB03B', '#F4F6F8', '#17B5C2'];
    for (var i = 0; i < 34; i++) {
      var s = document.createElement('span');
      s.style.cssText = 'left:' + (30 + Math.random() * 40) + '%;background:' + cols[i % 4] +
        ';--dx:' + ((Math.random() - .5) * 60) + 'vw;--dy:' + (-(30 + Math.random() * 40)) + 'vh;--r:' + (Math.random() * 720 - 360) + 'deg;animation-delay:' + (Math.random() * .25) + 's';
      conf.appendChild(s);
    }
  }
  function playCoded() {
    root.classList.remove('film'); root.classList.remove('start'); root.classList.add('play');
    if (RM) { step(5); pose('comemorando'); say('Agora é a sua vez: entre nas lojas.'); later(finish, 1800); return; }
    pose('triste'); step(1); say('Seu cliente procura o seu negócio…');
    later(function () { say('…e não encontra nenhum site.'); }, 1900);
    later(function () { pose('surpreso'); step(2); say('Até que um site acende.'); }, 3300);
    later(function () {
      step(3); var f = 0; pose('andando-1');
      walkIv = setInterval(function () { f = (f + 1) % 4; pose('andando-' + (f + 1)); }, 140);
      say('E o cliente chega até ele.');
    }, 4700);
    later(function () { clearInterval(walkIv); pose('feliz'); step(4); say('A venda acontece.'); }, 6300);
    later(function () { pose('comemorando'); step(5); burst(); say('Agora é a sua vez: entre nas lojas.'); }, 7600);
    later(finish, 9800);
  }

  // ---- abertura em vídeo (3 cenas coladas): túnel -> robô triste diante da loja apagada -> loja acende e a venda acontece ----
  var CUES = [   // segundos do vídeo
    { t: 0.9, say: 'Seu cliente procura o seu negócio…' },
    { t: 3.9, say: '' },
    { t: 7.3, say: '…e não encontra nenhum site.' },
    { t: 9.4, say: '' },
    { t: 10.8, say: 'Até que um site acende.' },
    { t: 13.0, say: 'E a venda acontece.' },
    { t: 15.2, say: 'Agora é a sua vez: entre nas lojas.' }
  ], ERR = [7.0, 9.0], END_AT = 16.45;
  var filmOn = false, cueI = 0, raf = 0, endedFilm = false;
  function filmSay(t) { fcap.classList.remove('on'); if (t) setTimeout(function () { fcap.textContent = t; fcap.classList.add('on'); }, 140); }
  function useCoded() {
    if (!filmOn) return; filmOn = false; cancelAnimationFrame(raf); try { vid.pause(); } catch (_) {}
    playCoded();
  }
  function endFilm() {
    if (endedFilm || ended) return; endedFilm = true;
    fflash.classList.add('on'); setTimeout(finish, 380);       // flash de luz e o site aparece
  }
  function tick() {
    if (!filmOn || ended) return;
    var t = vid.currentTime;
    while (cueI < CUES.length && t >= CUES[cueI].t) { filmSay(CUES[cueI].say); cueI++; }
    ferr.classList.toggle('on', t >= ERR[0] && t < ERR[1]);
    if (t >= END_AT || vid.ended) { endFilm(); return; }
    raf = requestAnimationFrame(tick);
  }
  function setSound(mute) {
    vid.muted = mute; vid.volume = 0.9;
    snd.textContent = mute ? 'Som: desligado' : 'Som: ligado'; snd.setAttribute('aria-pressed', String(mute));
  }
  snd.addEventListener('click', function () { setSound(!vid.muted); });
  function playFilm() {
    filmOn = true; cueI = 0; endedFilm = false;
    root.classList.remove('start'); root.classList.add('play', 'film');
    vid.currentTime = 0;
    setSound(false);
    var pr = vid.play();
    if (pr && pr.catch) pr.catch(function () {           // o navegador bloqueou o som: toca mudo e deixa o botão para ligar
      setSound(true);
      var p2 = vid.play(); if (p2 && p2.catch) p2.catch(useCoded);
    });
    vid.addEventListener('error', useCoded, { once: true });
    timers.push(setTimeout(function () { if (filmOn && vid.currentTime < 0.3) useCoded(); }, 4000));   // não carregou: usa a abertura em código
    raf = requestAnimationFrame(tick);
  }
  function play() {
    var saver = navigator.connection && navigator.connection.saveData;
    if (RM || saver || !vid.canPlayType || !vid.canPlayType('video/mp4')) playCoded(); else playFilm();
  }
  go.addEventListener('click', play);
  skip.addEventListener('click', finish);
  window.addEventListener('keydown', function (e) {
    if (ended) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'Enter' && root.classList.contains('start') && document.activeElement !== skip) { e.preventDefault(); play(); }
  });
})();
