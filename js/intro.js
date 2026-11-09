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

  var poses = ['triste', 'pensativo', 'feliz', 'comemorando', 'andando-1', 'andando-2', 'andando-3', 'andando-4'];
  var poseImgs = poses.map(function (p) { return '<img data-p="' + p + '" src="' + IMG('robo-' + p) + '" alt="" draggable="false">'; }).join('');
  var predios = [['predio-01', 1], ['predio-03', 24], ['predio-02', 47], ['predio-04', 68], ['predio-06', 84]]
    .map(function (b) { return '<img class="sc-pred" style="left:' + b[1] + '%" src="' + IMG(b[0]) + '" alt="" draggable="false">'; }).join('');

  root.innerHTML =
    '<div class="in-card">' +
      '<p class="in-eyebrow">Forja de in<b>SITES</b></p>' +
      '<h2 class="in-title">Veja o que um site muda no seu comércio.</h2>' +
      '<p class="in-sub">Um passeio rápido com o Forjabô, depois a rua é sua.</p>' +
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
      '<div class="film-err film-pop" style="left:51%;top:34%;width:30%"><div class="fe-bar"><i></i><i></i><i></i></div><div class="fe-body"><span class="fe-x">&#10005;</span><b>Não achei o que eu queria</b></div></div>' +
      '<div class="film-err film-pop" style="left:57%;top:55%;width:34%"><div class="fe-bar"><i></i><i></i><i></i></div><div class="fe-body"><span class="fe-x">&#10005;</span><b>Sem cardápio, horário ou contato</b></div></div>' +
      '<div class="film-chip">&#10003; Site no ar</div>' +
      '<div class="film-order"><span class="fo-ok">&#10003;</span><div><b>Pedido feito!</b><small>Pão Quente</small></div></div>' +
    '</div><p class="sc-cap film-cap" aria-live="polite"></p>' +
    '<button type="button" class="film-on" hidden>Ligar o site <span aria-hidden="true">&#8594;</span></button>' +
    '<div class="film-flash"></div></div>' +
    '<button type="button" class="in-sound" aria-pressed="false">Som: ligado</button>' +
    '<button type="button" class="in-skip">Pular</button>';
  document.body.appendChild(root);

  var scene = root.querySelector('.in-scene'), robot = root.querySelector('.sc-robot'),
      cap = root.querySelector('.sc-cap'), go = root.querySelector('.in-go'), skip = root.querySelector('.in-skip'),
      conf = root.querySelector('.sc-confetti'), vid = root.querySelector('.film-vid'), fcap = root.querySelector('.film-cap'),
      ferr = root.querySelector('.film-err'), fflash = root.querySelector('.film-flash'), snd = root.querySelector('.in-sound'),
      pops = [].slice.call(root.querySelectorAll('.film-pop')), fchip = root.querySelector('.film-chip'), forder = root.querySelector('.film-order'), fon = root.querySelector('.film-on');
  var timers = [], walkIv = 0, ended = false;
  var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
  var pose = function (p) { robot.dataset.pose = p; };
  var say = function (t) { cap.classList.remove('on'); setTimeout(function () { cap.textContent = t; cap.classList.add('on'); }, 160); };
  var step = function (n) { scene.dataset.step = n; };
  setTimeout(function () { go.focus({ preventScroll: true }); }, 50);

  function finish() {
    if (ended) return; ended = true;
    timers.forEach(clearTimeout); clearInterval(walkIv); filmOn = false; try { vid.pause(); } catch (_) {} stopNarr();
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
    later(function () { pose('pensativo'); step(2); say('Até que um site acende.'); }, 3300);
    later(function () {
      step(3); var f = 0; pose('andando-1');
      walkIv = setInterval(function () { f = (f + 1) % 4; pose('andando-' + (f + 1)); }, 140);
      say('E o cliente chega até ele.');
    }, 4700);
    later(function () { clearInterval(walkIv); pose('feliz'); step(4); say('A venda acontece.'); }, 6300);
    later(function () { pose('comemorando'); step(5); burst(); say('Agora é a sua vez: entre nas lojas.'); }, 7600);
    later(finish, 9800);
  }

  // ---- narração: arquivos do próprio autor (assets/audio/narracao-N.mp3) ou a voz do navegador em português ----
  //      config.js → narracao: "voz" | "arquivos" | "desligada"
  var CFGN = (window.SITE && window.SITE.narracao) || 'voz';
  var LINES = {
    procura: 'Seu cliente procura o seu negócio.',
    semsite: 'E não encontra nenhum site.',
    queda:   'Esta loja ainda não tem site. Vamos ligar?',
    acende:  'Até que um site acende.',
    venda:   'E a venda acontece.',
    final:   'Agora é a sua vez. Entre nas lojas.'
  };
  var FILES = { procura: 1, semsite: 2, queda: 3, acende: 4, venda: 5, final: 6 };
  var BG_VOL = CFGN === 'arquivos' || CFGN === 'voz' ? 0.28 : 0.75, BG_DUCK = 0.08;        // som do filme baixo, e mais baixo ainda enquanto a voz fala
  var auds = {}, ttsVoice = null, duckIv = 0, duckT = 0, curAud = null;
  function loadVoices() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices() || [], pt = vs.filter(function (v) { return /^pt/i.test(v.lang); });
    var pref = /luciana|francisca|google|maria|camila|thalita|vit[oó]ria/i;
    ttsVoice = pt.filter(function (v) { return /pt[-_]BR/i.test(v.lang) && pref.test(v.name); })[0] || pt.filter(function (v) { return /pt[-_]BR/i.test(v.lang); })[0] || pt[0] || null;
  }
  if (window.speechSynthesis) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (_) {} }
  if (CFGN === 'arquivos') Object.keys(FILES).forEach(function (k) { var a = new Audio('assets/audio/narracao-' + FILES[k] + '.mp3'); a.preload = 'auto'; auds[k] = a; });
  function duck(on) {                       // abaixa o som do vídeo enquanto a voz fala
    clearInterval(duckIv);
    var to = on ? BG_DUCK : BG_VOL;
    duckIv = setInterval(function () {
      var d = to - vid.volume;
      if (Math.abs(d) < 0.03) { vid.volume = to; clearInterval(duckIv); } else vid.volume = Math.max(0, Math.min(1, vid.volume + d * 0.3));
    }, 40);
  }
  function stopNarr() {
    clearTimeout(duckT); clearInterval(duckIv);
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (_) {}
    if (curAud) { try { curAud.pause(); } catch (_) {} curAud = null; }
  }
  function narrate(key) {
    if (CFGN === 'desligada' || vid.muted || !LINES[key] || ended) return;
    stopNarr(); duck(true);
    var done = function () { clearTimeout(duckT); if (!ended) duck(false); };
    duckT = setTimeout(done, 7000);
    if (CFGN === 'arquivos' && auds[key]) {
      var a = auds[key]; curAud = a; a.volume = 1;
      a.onended = done; a.onerror = function () { speak(key, done); };
      try { a.currentTime = 0; var pr = a.play(); if (pr && pr.catch) pr.catch(function () { speak(key, done); }); } catch (_) { speak(key, done); }
      return;
    }
    speak(key, done);
  }
  function speak(key, done) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { done(); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(LINES[key]);
      u.lang = 'pt-BR'; if (ttsVoice) u.voice = ttsVoice; u.rate = 0.92; u.pitch = 1; u.volume = 1;
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
    } catch (_) { done(); }
  }

  // ---- abertura em vídeo (3 cenas coladas): túnel -> robô triste diante da loja apagada -> PAUSA: "Ligar o site" -> loja acende e a venda acontece ----
  var RATE = 0.88;                            // um pouco mais devagar, para dar tempo de ler e ouvir
  var CUES = [   // segundos do vídeo (legendas; sem narração em áudio)
    { t: 0.6,  say: 'Seu cliente procura o seu negócio…' },
    { t: 3.4,  say: '…e não encontra nenhum site.' },
    { t: 7.9,  say: '' },
    { t: 11.5, say: 'Até que alguém constrói o site.' },
    { t: 14.3, say: 'A Forja de inSITES entra em ação.' },
    { t: 17.2, say: 'Um site acende.' },
    { t: 22.0, say: 'E a venda acontece.' },
    { t: 24.7, say: 'Agora é a sua vez: entre nas lojas.' }
  ], ERR = 8.2, PAUSE_AT = 10.9, END_AT = 28.5, POPS = [9.0, 9.8];
  var filmOn = false, cueI = 0, raf = 0, endedFilm = false, crashed = false, resumed = false;
  function filmSay(t) { fcap.classList.remove('on'); if (t) setTimeout(function () { fcap.textContent = t; fcap.classList.add('on'); }, 140); }
  function useCoded() {
    if (!filmOn) return; filmOn = false; cancelAnimationFrame(raf); try { vid.pause(); } catch (_) {} stopNarr();
    fon.hidden = true; playCoded();
  }
  function endFilm() {
    if (endedFilm || ended) return; endedFilm = true;
    fflash.classList.add('on'); setTimeout(finish, 380);       // flash de luz e o site aparece
  }
  function crash() {                          // o site "caiu": o filme pausa e espera o clique em "Ligar o site"
    crashed = true; try { vid.pause(); } catch (_) {}
    ferr.classList.add('on'); filmSay('Esta loja ainda não tem site.'); narrate('queda');
    fon.hidden = false; setTimeout(function () { fon.classList.add('on'); try { fon.focus({ preventScroll: true }); } catch (_) {} }, 30);
    timers.push(setTimeout(resume, 16000));    // ninguém clicou: segue sozinho
  }
  function resume() {
    if (resumed || ended) return; resumed = true;
    fon.classList.remove('on'); fon.hidden = true; ferr.classList.remove('on'); pops.forEach(function (e) { e.classList.remove('on'); });
    fflash.classList.remove('on'); root.classList.add('lit');
    setTimeout(function () { root.classList.remove('lit'); }, 700);
    filmSay(''); vid.playbackRate = RATE;
    var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
    raf = requestAnimationFrame(tick);
  }
  // sua voz manda no ritmo: o filme desacelera (ou espera) até a frase terminar, e a próxima só começa depois
  function voiceBusy() { return CFGN === 'arquivos' && curAud && !curAud.paused && !curAud.ended && !vid.muted; }
  function pace(t) {
    if (crashed && !resumed) return false;
    if (!voiceBusy()) { if (vid.playbackRate !== RATE) vid.playbackRate = RATE; return false; }
    var k = cueI - 1, g = (k >= 0 && CUES[k + 1]) ? CUES[k + 1].t : END_AT;
    if (!crashed && g > PAUSE_AT) g = PAUSE_AT;
    var rem = (isFinite(curAud.duration) ? curAud.duration - curAud.currentTime : 1) + 0.2, room = g - t;
    if (room <= 0.03) { if (!vid.paused) vid.pause(); return true; }                 // chegou no limite da cena e a voz ainda fala: espera
    if (vid.paused) { var pp = vid.play(); if (pp && pp.catch) pp.catch(function () {}); }
    vid.playbackRate = Math.max(0.25, Math.min(RATE, room / rem));
    return false;
  }
  function tick() {
    if (!filmOn || ended) return;
    var t = vid.currentTime;
    if (cueI < CUES.length && CUES[cueI].n && t >= CUES[cueI].t && voiceBusy()) {      // próxima fala só depois da anterior
      if (!vid.paused) vid.pause(); raf = requestAnimationFrame(tick); return;
    }
    if (!crashed || resumed) { if (vid.paused && !voiceBusy() && !endedFilm) { var p3 = vid.play(); if (p3 && p3.catch) p3.catch(function () {}); } }
    while (cueI < CUES.length && t >= CUES[cueI].t) { filmSay(CUES[cueI].say); if (CUES[cueI].n) narrate(CUES[cueI].n); cueI++; }
    if (!crashed && t >= ERR) ferr.classList.add('on');
    pops.forEach(function (e, i) { if (!resumed && t >= POPS[i]) e.classList.add('on'); });
    if (!crashed && t >= PAUSE_AT) { crash(); return; }          // o laço para aqui até o clique
    if (crashed && resumed && t >= PAUSE_AT + 0.4) ferr.classList.remove('on');
    fchip.classList.toggle('on', t >= 18.6 && t < 21.6);
    forder.classList.toggle('on', t >= 22.9 && t < 24.6);
    if ((t >= END_AT || vid.ended) && !voiceBusy()) { endFilm(); return; }
    pace(t);
    raf = requestAnimationFrame(tick);
  }
  function setSound(mute) {
    vid.muted = mute; vid.volume = BG_VOL;
    if (mute) stopNarr();
    snd.textContent = mute ? 'Som: desligado' : 'Som: ligado'; snd.setAttribute('aria-pressed', String(mute));
  }
  snd.addEventListener('click', function () { setSound(!vid.muted); });
  fon.addEventListener('click', function () { resume(); });
  function playFilm() {
    filmOn = true; cueI = 0; endedFilm = false; crashed = false; resumed = false;
    root.classList.remove('start'); root.classList.add('play', 'film');
    vid.currentTime = 0; vid.playbackRate = RATE;
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
