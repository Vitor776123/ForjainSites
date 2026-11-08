/* Forja de inSITES — rua interativa
   Rua lateral em camadas (parallax). O robô anda com ← →, A/D, botões na tela ou arrastando.
   Todas as medidas internas estão em "unidades de altura" (1 = altura do hero), então a cena escala sozinha. */
(() => {
'use strict';

const A = window.ASSETS, SG = window.SIGNS;
const IMG = n => 'assets/img/' + n + '.webp';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- dados das lojas (nomes fictícios de demonstração) ---------- */
const SHOPS = [
  { slug:'padaria', dor:"O cliente não sabe se ainda tem pão, nem a hora que sai do forno.", sol:"Cardápio do dia sempre atualizado e pedido direto pelo WhatsApp.",     kicker:'Padaria',      brand:'Pão Quente',    desc:'Cardápio do dia, encomendas de bolos e pedido pelo WhatsApp.',         color:'#8a4b12', font:'serif' },
  { slug:'adega', dor:"O cliente não acha rótulo nem preço e acaba comprando no concorrente.", sol:"Vitrine de vinhos com filtros, harmonização e clube de assinatura.",       kicker:'Adega',        brand:'Vinho & Prosa', desc:'Vitrine de rótulos, harmonizações e clube de assinatura.',            color:'#f0d9a0', font:'serifi' },
  { slug:'academia', dor:"Quem pergunta plano e horário no direct fica sem resposta.", sol:"Planos, grade de aulas e matrícula online, sem fila.",    kicker:'Academia',     brand:'Pulso',         desc:'Planos, horários das aulas e matrícula online.',                      color:'#c6ff3a', font:'sans' },
  { slug:'barbearia', dor:"Agenda no caderno e no WhatsApp: horário perdido e cliente esperando.", sol:"Agendamento online com os horários livres à vista.",   kicker:'Barbearia',    brand:'Navalha',       desc:'Serviços, equipe e agendamento de horário.',                          color:'#e9c27c', font:'serif' },
  { slug:'petshop', dor:"Banho e tosa marcados por mensagem viram confusão de horário.", sol:"Agendamento fácil e lembretes de vacina e retorno.",     kicker:'Pet Shop',     brand:'Patinhas',      desc:'Banho e tosa, produtos e agendamento para o seu pet.',                color:'#2e6b3a', font:'sans' },
  { slug:'pizzaria', dor:"O pedido passa por aplicativos que levam uma fatia do lucro.", sol:"Cardápio próprio e pedido de entrega direto com você.",    kicker:'Pizzaria',     brand:'Forno a Lenha', desc:'Cardápio, promoções e pedido de entrega.',                            color:'#b3261e', font:'serif' },
  { slug:'farmacia', dor:"O cliente liga só para saber se tem o produto e que horas fecha.", sol:"Serviços, horários e contato rápido num só lugar.",    kicker:'Farmácia',     brand:'Vida',          desc:'Serviços, campanhas de saúde e contato rápido.',                      color:'#1a8f4a', font:'sans' },
  { slug:'oficina', dor:"Orçamento por telefone demora e o cliente não sabe como está o carro.", sol:"Pedido de orçamento online e acompanhamento do conserto.",     kicker:'Oficina',      brand:'Torque',        desc:'Serviços, orçamento rápido e histórico do cliente.',                  color:'#ffd23f', font:'sans' },
  { slug:'roupas', dor:"Só o Instagram: peças se perdem e é difícil achar tamanho e preço.", sol:"Vitrine organizada por coleção e atendimento por mensagem.",      kicker:'Moda',         brand:'Ateliê 7',      desc:'Coleções, vitrine e atendimento por mensagem.',                       color:'#6b3fa0', font:'serifi' },
  { slug:'floricultura', dor:"Em datas como o Dia das Mães o WhatsApp lota e pedidos se perdem.", sol:"Catálogo de arranjos e pedido organizado, com entrega combinada.",kicker:'Floricultura', brand:'Pétala',        desc:'Arranjos, datas especiais e entrega no mesmo dia.',                   color:'#c2417a', font:'serifi' }
];
const READY = new Set(['padaria','adega','academia']); // modelos já com página mais completa (por enquanto todos são provisórios)

/* props entre as lojas: [sprite, altura, deslocamento dentro do vão] */
const GAPS = [
  [['arvore-1',.40,.03],['poste-classico',.33,.24]],
  [['ponto-onibus',.27,.03]],
  [['arvore-flor',.38,.03],['hidrante',.09,.26]],
  [['poste-moderno',.38,.03],['arvore-2',.44,.20]],
  [['semaforo',.33,.03],['banco',.09,.14]],
  [['arvore-1',.40,.03],['lixeira',.09,.26]],
  [['arvore-2',.44,.03],['poste-classico',.33,.28]],
  [['arvore-flor',.38,.03],['poste-moderno',.38,.24]],
  [['ponto-onibus',.27,.03]],
  [['arvore-2',.44,.03],['poste-classico',.33,.26]]
];

/* ---------- constantes de cena (em unidades de altura) ---------- */
const SHOP_H = .40, SHOP_BASE = .70, SIDEWALK_TOP = .695, SIDEWALK_BOT = .80;
const CURB_H = .016, ROAD_TOP = SIDEWALK_BOT + CURB_H;
const ROBOT_H = .29, ROBOT_FEET = .775, PROP_BASE = .765;
const VMAX = .50;          // velocidade máxima (alturas por segundo)
const FAR_F = .10, MID_F = .28;
const FRAME_STEP = .05;    // distância percorrida por quadro de caminhada
const LANE_F = .935, LANE_N = .995, VY = .42;   // faixas da rua (linha do chão dos carros) e velocidade vertical
const JUMP_V = .98, GRAV = 2.7;   // pulo: ~.18 de altura, ~.73 s no ar
const ROBOT_OFFSET = {'robo-apontando': -.16};  // alinha o corpo (o braço estica para a frente)

/* ---------- elementos ---------- */
const hero = document.getElementById('hero');
const stage = document.getElementById('stage');
const hintEl = document.getElementById('hint');
const liveEl = document.getElementById('live');
const modal = document.getElementById('modal');
const frameEl = document.getElementById('modal-frame');
const modalTitle = document.getElementById('modal-title');
const modalOpenLink = document.getElementById('modal-open');
const grid = document.getElementById('grid');
const strip = document.getElementById('win-strip');
const CFG = window.SITE || {};
const actEl = document.getElementById('padAct');
const cardEl = document.getElementById('shopcard');
const scBtn = document.getElementById('scBtn');

/* ---------- estado ---------- */
let H = 0, VW = 0, vwU = 0, L = 0, MINU = .2;
let robotU = .5, camU = 0, vel = 0, phase = 0, lastRobot = .5, facing = 1;
let keyL = false, keyR = false, padDir = 0, drag = null;
let targetU = null, pendingShop = null, activeIdx = -1;
let wasAway = false, heroVisible = true, modalOpen = false, opener = null, moved = false;
let camK = 0, camShop = -1, textHidden = false;
let jy = 0, jv = 0, airborne = false;
let ry = ROBOT_FEET, keyU = false, keyD = false, padV = 0, stun = 0, invul = 0, knockTo = ROBOT_FEET, crossed = false, crossT = 0;
let layers = {}, shopEls = [], shopCx = [], shopW = [], pills = [], chips = [], panels = [], cars = [], robotEl, rIdle, rframes = {}, curFrame = '', rflip, rshadow;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function div(cls, parent, css) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (css) Object.assign(d.style, css);
  if (parent) parent.appendChild(d);
  return d;
}
/* sprite posicionado: x = borda esquerda, bottom = linha do chão (em unidades) */
function sprite(name, hU, parent, x, bottom, cls) {
  const [w, h] = A[name];
  const hh = hU * H, ww = hh * w / h;
  const i = document.createElement('img');
  i.src = IMG(name); i.alt = ''; i.draggable = false; i.decoding = 'async';
  i.className = cls || '';
  Object.assign(i.style, { position:'absolute', width:ww + 'px', height:hh + 'px', left:(x * H) + 'px', top:((bottom - hU) * H) + 'px' });
  parent.appendChild(i);
  return ww / H;
}

/* ---------- construção da cena ---------- */
function build() {
  H = Math.max(hero.clientHeight, 460); VW = hero.clientWidth; vwU = VW / H;
  stage.innerHTML = ''; shopEls = []; shopCx = []; shopW = []; pills = []; chips = []; panels = []; cars = []; rframes = {}; curFrame = '';

  // 1) céu
  const sky = div('sky', stage);
  div('sun', sky, { left:(vwU * .62 * H) + 'px', top:(.38 * H) + 'px', width:(.62 * H) + 'px', height:(.62 * H) + 'px', transform:'translate(-50%,-50%)' });
  {
    [[.10,.20,.34,.05,70],[.30,.46,.26,.04,95],[.18,.70,.40,.06,120]].forEach(([top, left, w, h, dur], k) => {
      const c = div('cloud', sky, { top:(top * H) + 'px', left:(left * 100 - 20) + 'vw', width:(w * H) + 'px', height:(h * H) + 'px', animationDuration:dur + 's', animationDelay:(-k * 23) + 's' });
      if (RM) c.style.animation = 'none';
    });
  }

  // 2) posições do mundo (lojas e props)
  let cur = vwU < 1 ? .8 : 1.05; const lay = [];
  SHOPS.forEach((s, i) => {
    const name = 'loja-' + s.slug, [w, h] = A[name];
    const wu = SHOP_H * w / h;
    lay.push({ type:'shop', i, x:cur, w:wu, name });
    shopCx[i] = cur + wu / 2; shopW[i] = wu;
    cur += wu;
    let gw = 0;
    (GAPS[i] || []).forEach(([pn, ph, dx]) => {
      const pw = ph * A[pn][0] / A[pn][1];
      lay.push({ type:'prop', name:pn, h:ph, x:cur + dx, w:pw });
      gw = Math.max(gw, dx + pw);
    });
    cur += gw + .06;
  });
  L = cur + .9;
  MINU = .2;

  // 3) prédios ao fundo (duas camadas de profundidade)
  const bnames = Object.keys(A).filter(k => k.startsWith('predio-'));
  const makeSkyline = (cls, factor, seed, hmin, hmax, haze) => {
    const lyr = div('layer ' + cls, stage); layers[cls] = lyr;
    const need = (L - vwU) * factor + vwU * 1.15 + 1.2;
    const r = rng(seed); let x = -.2, last = '';
    while (x < need) {
      let n; do { n = bnames[Math.floor(r() * bnames.length)]; } while (n === last);
      last = n;
      let hu = hmin + r() * (hmax - hmin);
      if (n === 'predio-05') hu = Math.min(hmax * 1.25, hu * 1.2);
      const wu = sprite(n, hu, lyr, x, SHOP_BASE + .01);
      x += wu + (-.01 + r() * .05);
    }
    const hz = div('haze', lyr, { left:0, top:((SHOP_BASE - hmax * 1.3) * H) + 'px', height:(hmax * 1.3 * H) + 'px', width:(x * H) + 'px', background:'linear-gradient(to bottom, rgba(255,205,150,0), rgba(255,200,145,' + haze + '))' });
    return lyr;
  };
  makeSkyline('far', FAR_F, 7, .24, .38, .62);
  makeSkyline('mid', MID_F, 31, .30, .50, .28);

  // 4) camada principal: calçada, lojas, props
  const main = div('layer main', stage); layers.main = main;
  const wpx = (L + vwU) * H;
  const sw = div('sidewalk', main, { left:(-vwU * H) + 'px', top:(SIDEWALK_TOP * H) + 'px', width:wpx + vwU * H + 'px', height:((SIDEWALK_BOT - SIDEWALK_TOP) * H) + 'px' });
  sw.style.setProperty('--tile', (.26 * H) + 'px');
  div('curb', main, { left:(-vwU * H) + 'px', top:(SIDEWALK_BOT * H) + 'px', width:wpx + vwU * H + 'px', height:(CURB_H * H) + 'px' });

  lay.filter(o => o.type === 'shop').forEach(o => {
    const s = SHOPS[o.i];
    const b = document.createElement('button');
    b.className = 'shop'; b.type = 'button'; b.dataset.i = o.i;
    b.setAttribute('aria-label', 'Entrar no site de exemplo: ' + s.kicker + ' ' + s.brand);
    Object.assign(b.style, { left:(o.x * H) + 'px', top:((SHOP_BASE - SHOP_H) * H) + 'px', width:(o.w * H) + 'px', height:(SHOP_H * H) + 'px' });
    const im = document.createElement('img'); im.src = IMG(o.name); im.alt = ''; im.draggable = false; b.appendChild(im);
    // placa com o nome
    const g = SG[s.slug];
    if (g) {
      const sg = div('sign', b, { left:(g.x * 100 + g.w * 7) + '%', top:(g.y * 100 + g.h * 8) + '%', width:(g.w * 86) + '%', height:(g.h * 84) + '%', color:s.color });
      sg.dataset.font = s.font;
      const k = document.createElement('span'); k.className = 'k'; k.textContent = s.kicker;
      const br = document.createElement('span'); br.className = 'b'; br.textContent = s.brand;
      sg.appendChild(k); sg.appendChild(br);
    }
    main.appendChild(b); shopEls[o.i] = b;
    // chave "sem site" sobre a loja + painel com a dor
    const p = div('pill', main, { left:(shopCx[o.i] * H) + 'px', top:((SHOP_BASE - SHOP_H - .015) * H) + 'px' });
    const pc = div('pc', p);
    const dp = document.createElement('p'); dp.className = 'dor'; dp.textContent = s.dor;
    const pb = document.createElement('button'); pb.type = 'button'; pb.tabIndex = -1; pb.dataset.act = 'on'; pb.dataset.i = o.i;
    pb.innerHTML = 'Ligar o site <span aria-hidden="true">→</span>';
    pc.appendChild(dp); pc.appendChild(pb);
    const chip = document.createElement('button'); chip.type = 'button'; chip.tabIndex = -1; chip.className = 'chip';
    chip.dataset.act = 'chip'; chip.dataset.i = o.i; p.appendChild(chip);
    pills[o.i] = p; chips[o.i] = chip; panels[o.i] = pc;
    paintShop(o.i);
  });
  lay.filter(o => o.type === 'prop').forEach(o => sprite(o.name, o.h, main, o.x, PROP_BASE, 'prop'));

  // 5) robô (fixo na tela em x; o mundo é que corre atrás)
  robotEl = div('robot', stage, { width:'0', height:'0' });
  rshadow = div('rshadow', robotEl, { left:(-ROBOT_H * H * .32) + 'px', top:(-.012 * H) + 'px', width:(ROBOT_H * H * .64) + 'px', height:(.034 * H) + 'px' });
  rflip = div('rflip', robotEl);
  const rbob = div('rbob', rflip);
  ['robo-andando-1','robo-andando-2','robo-andando-3','robo-andando-4','robo-apontando','robo-comemorando','robo-triste'].forEach(n => {
    const [w, h] = A[n], hh = ROBOT_H * H, ww = hh * w / h;
    const i = document.createElement('img'); i.src = IMG(n); i.alt = ''; i.draggable = false; i.className = 'rframe';
    Object.assign(i.style, { width:ww + 'px', height:hh + 'px', transform:'translateX(' + (-50 + (ROBOT_OFFSET[n] || 0) * 100) + '%)' });
    rbob.appendChild(i); rframes[n] = i;
  });
  rIdle = rbob;
  setFrame('robo-andando-3');

  // 6) pista com carros (à frente do robô)
  const road = div('layer roadlayer roadbg', stage); layers.road = road;
  const carsF = div('layer roadlayer carsF', stage); layers.roadF = carsF;
  const carsN = div('layer roadlayer carsN', stage); layers.roadN = carsN;
  div('road', road, { left:(-vwU * H) + 'px', top:(ROAD_TOP * H) + 'px', width:wpx + vwU * H + 'px', height:((1 - ROAD_TOP) * H + 4) + 'px' });
  const lane = div('lane', road, { left:(-vwU * H) + 'px', top:(.94 * H) + 'px', width:wpx + vwU * H + 'px', height:(.007 * H) + 'px' });
  lane.style.setProperty('--dash', (.09 * H) + 'px');
  const V = { 'carro-hatch':.125, 'carro-sedan':.115, 'van':.15, 'onibus':.20, 'moto':.13, 'taxi':.12 };
  const names = Object.keys(V), r = rng(99);
  const laneCars = (n, dirSign, bottom, scale, speed, pool, lane) => {
    for (let k = 0; k < n; k++) {
      const nm = pool[Math.floor(r() * pool.length)], hh = V[nm] * scale, ww = hh * A[nm][0] / A[nm][1];
      const wrap = div('car', lane === 1 ? carsF : carsN, { width:(ww * H) + 'px', height:(hh * H) + 'px', top:((bottom - hh) * H) + 'px' });
      const im = document.createElement('img'); im.src = IMG(nm); im.alt = ''; im.draggable = false;
      im.style.cssText = 'width:100%;height:100%;display:block;' + (dirSign < 0 ? 'transform:scaleX(-1);' : '');
      wrap.appendChild(im);
      cars.push({ el:wrap, w:ww, x:(L + 2.4) * (k + r() * .6) / n - 1.2, v:dirSign * speed * (.85 + r() * .4), lane, stop:0, img:im });
    }
  };
  laneCars(7, 1, LANE_F, .86, .10, names, 1);
  laneCars(6, -1, LANE_N, 1.08, .17, names.filter(n => n !== 'onibus'), 2);

  // 7) brilho dourado por cima de tudo
  div('tint', stage);

  fitSigns();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSigns);
  applyCamera(); renderRobot(true);
}

/* ajusta o texto das placas para caber */
function fitSigns() {
  document.querySelectorAll('.sign').forEach(sg => {
    const h = sg.clientHeight, w = sg.clientWidth;
    if (!h || !w) return;
    const k = sg.querySelector('.k'), b = sg.querySelector('.b'), f = sg.dataset.font;
    const fam = f === 'sans' ? 'var(--sans)' : 'var(--serif)';
    b.style.fontFamily = fam;
    b.style.fontWeight = f === 'sans' ? '800' : '700';
    b.style.fontStyle = f === 'serifi' ? 'italic' : 'normal';
    b.style.textTransform = f === 'sans' ? 'uppercase' : 'none';
    b.style.letterSpacing = f === 'sans' ? '.04em' : '0';
    let fs = h * .46;
    k.style.fontSize = (h * .17) + 'px';
    b.style.fontSize = fs + 'px';
    for (let n = 0; n < 14 && b.scrollWidth > w * .98; n++) { fs *= .92; b.style.fontSize = fs + 'px'; }
    if (k.scrollWidth > w) k.style.fontSize = (parseFloat(k.style.fontSize) * w / k.scrollWidth * .95) + 'px';
  });
}

/* ---------- câmera e robô ---------- */
function applyCamera() {
  const t = f => 'translate3d(' + (-camU * H * f) + 'px,0,0)';
  if (layers.far) layers.far.style.transform = t(FAR_F);
  if (layers.mid) layers.mid.style.transform = t(MID_F);
  if (layers.main) layers.main.style.transform = t(1);
  if (layers.road) layers.road.style.transform = t(1);
  if (layers.roadF) layers.roadF.style.transform = t(1);
  if (layers.roadN) layers.roadN.style.transform = t(1);
}
function setFrame(n) {
  if (n === curFrame) return;
  if (rframes[curFrame]) rframes[curFrame].classList.remove('on');
  rframes[n].classList.add('on'); curFrame = n;
}
function renderRobot() {
  const sx = (robotU - camU) * H, sy = ry * H;
  const sc = 1 + Math.max(0, ry - ROBOT_FEET) * .55;
  robotEl.style.transform = 'translate3d(' + sx + 'px,' + (sy - jy * H) + 'px,0) scale(' + sc + ')';
  robotEl.style.zIndex = ry < LANE_F - .005 ? 5 : (ry < LANE_N - .005 ? 7 : 9);
  rshadow.style.transform = 'translateY(' + (jy * H) + 'px) scale(' + (1 - Math.min(.45, jy * 2.2)) + ')';
  rflip.style.transform = 'scaleX(' + facing + ')';
}
const siteOn = [], panelOpen = [];
const LOCK = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 0 1 4 0v2h-4V7z"/></svg>';
const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function paintShop(i) {
  const on = !!siteOn[i], el = shopEls[i], c = chips[i], p = pills[i];
  el.classList.toggle('off', !on);
  p.classList.toggle('is-on', on);
  p.classList.toggle('open', !!panelOpen[i]);
  const dpEl = panels[i].querySelector('.dor'), pbEl = panels[i].querySelector('button');
  dpEl.textContent = on ? SHOPS[i].sol : SHOPS[i].dor;
  pbEl.innerHTML = (on ? 'Ver o site' : 'Ligar o site') + ' <span aria-hidden="true">→</span>';
  if (i === activeIdx) updateAct();
  c.classList.toggle('live', on);
  c.innerHTML = on ? TICK + ' Site no ar' : LOCK + ' Sem site';
  const nome = SHOPS[i].kicker + ' ' + SHOPS[i].brand;
  c.setAttribute('aria-label', on ? nome + ': site no ar. Abrir a prévia.' : nome + ': sem site. Ativar para ver a dor.');
  el.setAttribute('aria-label', (on ? 'Ver o site de exemplo: ' : 'Sem site: ') + nome);
}
function explainShop(i) {
  panelOpen[i] = true; paintShop(i);
  const el = shopEls[i];
  el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny');
  setTimeout(() => el.classList.remove('deny'), 1500);
  liveEl.textContent = SHOPS[i].kicker + ' ' + SHOPS[i].brand + ': sem site disponível. ' + SHOPS[i].dor + ' Pressione Enter de novo para ligar o site.';
}
function turnOnShop(i) {
  siteOn[i] = true; panelOpen[i] = true; paintShop(i);
  const el = shopEls[i];
  el.classList.remove('deny', 'ignite'); void el.offsetWidth; el.classList.add('ignite');
  setTimeout(() => el.classList.remove('ignite'), 1100);
  liveEl.textContent = SHOPS[i].kicker + ' ' + SHOPS[i].brand + ': site no ar. ' + SHOPS[i].sol + ' Pressione Enter para ver a prévia.';
}
function shopAction(i) {
  if (siteOn[i]) openShop(i);
  else if (panelOpen[i]) turnOnShop(i);
  else explainShop(i);
}
const touchMQ = window.matchMedia('(hover:none),(max-width:720px)');
function updateAct() {
  if (!actEl) return;
  const i = activeIdx;
  if (i < 0) { actEl.hidden = true; cardEl.classList.remove('on'); return; }
  const on = !!siteOn[i], open = !!panelOpen[i], s = SHOPS[i];
  actEl.hidden = false;
  actEl.textContent = on ? 'Ver o site' : (open ? 'Ligar o site' : 'Entrar na loja');
  actEl.classList.toggle('is-on', on);
  scBtn.textContent = actEl.textContent;
  cardEl.querySelector('.sc-k').textContent = s.kicker + ' · ' + s.brand;
  cardEl.querySelector('.sc-t').textContent = on ? s.sol : (open ? s.dor : 'Esta loja ainda não tem site.');
  cardEl.classList.toggle('on', true);
  cardEl.classList.toggle('is-on', on);
}
function setActive(i) {
  if (i === activeIdx) return;
  if (activeIdx >= 0) { shopEls[activeIdx].classList.remove('active'); pills[activeIdx].classList.remove('on'); panelOpen[activeIdx] = false; paintShop(activeIdx); }
  activeIdx = i;
  if (i >= 0) {
    shopEls[i].classList.add('active'); pills[i].classList.add('on');
    liveEl.textContent = SHOPS[i].kicker + ' ' + SHOPS[i].brand + (siteOn[i] ? ': site no ar. Pressione Enter para ver a prévia.' : ': sem site. Pressione Enter para ver o que isso custa.');
  }
  updateAct();
}

/* ---------- rua: carro bate no robô ---------- */
function hitByCar(c) {
  c.stop = 1.4;
  c.img.classList.remove('hit'); void c.img.offsetWidth; c.img.classList.add('hit');
  stun = .9; invul = 2.2; vel = 0;
  knockTo = Math.max(ROBOT_FEET, ry - .12);
  airborne = true; jv = .62;
  liveEl.textContent = 'Um carro esbarrou no robô. Ele se recupera e continua.';
}
function crossStreet() {
  crossed = true; crossT = performance.now();
  hintEl.classList.add('off');
  liveEl.textContent = 'O robô atravessou a rua e seguiu para a próxima parte da página.';
  setTimeout(() => {
    const t = document.getElementById('dor');
    if (t && crossed) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  }, 350);
}

/* ---------- pulo ---------- */
function jump() {
  if (airborne || modalOpen || !heroVisible || !H) return;
  airborne = true; jv = JUMP_V;
}

/* ---------- laço principal ---------- */
let last = performance.now();
function tick(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (!H) { requestAnimationFrame(tick); return; }

  // entrada
  let dir = 0;
  if (!modalOpen && heroVisible && stun <= 0 && !crossed) dir = clamp((keyR ? 1 : 0) - (keyL ? 1 : 0) + padDir, -1, 1);
  let desired = dir * VMAX;
  if (dir !== 0) { targetU = null; pendingShop = null; }
  else if (targetU !== null && !modalOpen) {
    const d = targetU - robotU;
    if (Math.abs(d) < .012) {
      robotU = targetU; targetU = null;
      const p = pendingShop; pendingShop = null; vel = 0;
      if (p !== null) shopAction(p);
    } else desired = Math.sign(d) * Math.min(VMAX, Math.max(.14, Math.abs(d) * 2.4));
  }
  if (!drag) { vel += (desired - vel) * Math.min(1, dt * 9); robotU += vel * dt; }

  // vertical: descer à rua, subir de volta à calçada, atravessar
  stun -= dt; invul -= dt;
  const ry0 = ry;
  if (stun > 0) ry += (knockTo - ry) * Math.min(1, dt * 6);
  else if (!crossed) {
    let vd = 0;
    if (!modalOpen && heroVisible) vd = clamp((keyD ? 1 : 0) - (keyU ? 1 : 0) + padV, -1, 1);
    if ((targetU !== null || pendingShop !== null) && ry > ROBOT_FEET) vd = -1;
    ry = clamp(ry + vd * VY * dt, ROBOT_FEET, 1.42);
    if (ry > 1.3) crossStreet();
  }
  const dyAbs = Math.abs(ry - ry0);
  if (!crossed && ry > ROBOT_FEET + .04 && invul <= 0 && jy < .06) {
    for (const c of cars) {
      if (Math.abs(ry - (c.lane === 1 ? LANE_F : LANE_N)) > .06) continue;
      if (Math.abs(robotU - (c.x + c.w / 2)) < c.w / 2 + .03) { hitByCar(c); break; }
    }
  }
  if (crossed && heroVisible && performance.now() - crossT > 1800) { crossed = false; ry = ROBOT_FEET; }
  robotU = clamp(robotU, MINU, L - .5);
  const maxCam = Math.max(0, L - vwU);
  const baseCam = clamp(robotU - .34 * vwU, 0, maxCam);
  const narrow = vwU < 1.1;
  if (activeIdx >= 0) camShop = activeIdx;
  camK += (((narrow && activeIdx >= 0) ? 1 : 0) - camK) * Math.min(1, dt * 7);
  if (camK < .002) camK = 0;
  camU = camK > 0 && camShop >= 0 ? baseCam + (clamp(shopCx[camShop] - vwU / 2, 0, maxCam) - baseCam) * camK : baseCam;

  // animação de caminhada
  const dm = robotU - lastRobot; lastRobot = robotU;
  const speed = dt > 0 ? (Math.abs(dm) + dyAbs) / dt : 0;
  const walking = speed > .035;
  if (dyAbs > 0 && ry > ROBOT_FEET + .05) hintEl.classList.add('off');
  if (walking) { phase += Math.abs(dm) + dyAbs; if (Math.abs(dm) > 1e-5) facing = dm > 0 ? 1 : -1; if (!moved && Math.abs(robotU - .5) > .25) { moved = true; hintEl.classList.add('off'); } }

  // loja ativa (perto da porta)
  let a = -1;
  if (ry < ROBOT_FEET + .03 && !crossed) for (let i = 0; i < shopCx.length; i++) if (Math.abs(robotU - shopCx[i]) < shopW[i] * .42) { a = i; break; }
  setActive(a);
  if (narrow && moved) textHidden = true;
  const away = robotU > .95 || (narrow && textHidden);
  if (away !== wasAway) { wasAway = away; hero.classList.toggle('away', away); }

  // pulo
  if (airborne) { jv -= GRAV * dt; jy += jv * dt; if (jy <= 0) { jy = 0; jv = 0; airborne = false; } }

  // quadro do robô
  if (stun > 0) setFrame('robo-triste');
  else if (airborne) setFrame('robo-comemorando');
  else if (walking) setFrame('robo-andando-' + (Math.floor(phase / FRAME_STEP) % 4 + 1));
  else if (a >= 0) { facing = shopCx[a] >= robotU ? 1 : -1; setFrame('robo-apontando'); }
  else setFrame('robo-andando-3');
  robotEl.classList.toggle('idle', !walking && !airborne && stun <= 0);

  // carros
  for (const c of cars) if (c.stop > 0) c.stop -= dt;
  for (const c of cars) {
    let vv = c.v;
    if (c.stop > 0) vv = 0;
    else for (const d of cars) {
      if (d === c || d.lane !== c.lane || d.stop <= 0) continue;
      const gap = c.v > 0 ? d.x - (c.x + c.w) : c.x - (d.x + d.w);
      if (gap > -.02 && gap < .05) { vv = 0; break; }
    }
    c.x += vv * dt;
    if (c.v > 0 && c.x > L + 1.4) c.x = -c.w - 1.2 - Math.random() * 1.5;
    if (c.v < 0 && c.x < -c.w - 1.4) c.x = L + 1.2 + Math.random() * 1.5;
  }
  for (const c of cars) c.el.style.transform = 'translate3d(' + (c.x * H) + 'px,0,0)';

  applyCamera(); renderRobot();
  requestAnimationFrame(tick);
}

/* ---------- janela de prévia ---------- */
function openShop(i) {
  const s = SHOPS[i];
  opener = document.activeElement;
  modalTitle.textContent = 'Modelo · ' + s.kicker + ' ' + s.brand;
  const url = s.slug + '/index.html';
  modalOpenLink.href = url;
  strip.querySelector('.s-dor').textContent = s.dor;
  strip.querySelector('.s-sol').textContent = s.sol;
  frameEl.src = url;
  modal.hidden = false;
  modalOpen = true; keyL = keyR = keyU = keyD = false; padDir = 0; padV = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('open')));
  setTimeout(() => modal.querySelector('.win-close').focus({ preventScroll:true }), 60);
}
function closeModal() {
  if (!modalOpen) return;
  modal.classList.remove('open'); modalOpen = false;
  setTimeout(() => { if (!modalOpen) { modal.hidden = true; frameEl.src = 'about:blank'; } }, 260);
  if (opener && opener.focus) opener.focus({ preventScroll:true });
}
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });

function walkToShop(i, thenOpen) {
  targetU = shopCx[i]; pendingShop = thenOpen ? i : null;
}

/* ---------- entradas: teclado, botões, arrasto ---------- */
window.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (window.INTRO_OPEN) return;
  if (modalOpen) { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } return; }
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || !heroVisible) return;
  const k = e.key;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') { keyR = true; e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keyL = true; e.preventDefault(); }
  else if (k === 'Enter' && activeIdx >= 0 && (tag === 'BODY' || tag === 'SECTION' || tag === 'MAIN' || tag === 'HTML')) { e.preventDefault(); shopAction(activeIdx); }
  else if ((k === 'ArrowDown' || k === 's' || k === 'S') && (tag === 'BODY' || tag === 'SECTION' || tag === 'MAIN' || tag === 'HTML')) { keyD = true; e.preventDefault(); }
  else if ((k === 'ArrowUp' || k === 'w' || k === 'W') && (tag === 'BODY' || tag === 'SECTION' || tag === 'MAIN' || tag === 'HTML')) {
    e.preventDefault();
    if (ry > ROBOT_FEET + .02) keyU = true; else if (!e.repeat) jump();
  }
  else if (k === ' ' && (tag === 'BODY' || tag === 'SECTION' || tag === 'MAIN' || tag === 'HTML')) { e.preventDefault(); if (!e.repeat) jump(); }
});
window.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keyR = false;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyL = false;
  if (k === 'ArrowDown' || k === 's' || k === 'S') keyD = false;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') keyU = false;
});
window.addEventListener('blur', () => { keyL = keyR = keyU = keyD = false; padDir = 0; padV = 0; });

const holdPad = (id, d) => {
  const b = document.getElementById(id);
  const on = e => { e.preventDefault(); padDir = d; };
  const off = () => { if (padDir === d) padDir = 0; };
  b.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off));
  b.addEventListener('contextmenu', e => e.preventDefault());
};
holdPad('padL', -1); holdPad('padR', 1);
const jumpBtn = document.getElementById('padJump'), downBtn = document.getElementById('padDown');
jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (ry > ROBOT_FEET + .02) padV = -1; else jump(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => jumpBtn.addEventListener(ev, () => { if (padV === -1) padV = 0; }));
downBtn.addEventListener('pointerdown', e => { e.preventDefault(); padV = 1; });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => downBtn.addEventListener(ev, () => { if (padV === 1) padV = 0; }));
[jumpBtn, downBtn].forEach(b => b.addEventListener('contextmenu', e => e.preventDefault()));
const actGo = () => { if (activeIdx >= 0 && !modalOpen) shopAction(activeIdx); };
actEl.addEventListener('click', actGo); scBtn.addEventListener('click', actGo);

stage.addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button !== 0) return;
  drag = { x:e.clientX, y:e.clientY, id:e.pointerId, startX:e.clientX, moved:false, target:e.target };
});
window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(e.clientX - drag.startX) > 8) {
    drag.moved = true; stage.classList.add('dragging'); targetU = null; pendingShop = null;
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  }
  if (drag.moved) { robotU -= (dx / H) * 1.15; vel = 0; drag.x = e.clientX; }
});
const endDrag = e => {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const was = drag; drag = null; stage.classList.remove('dragging');
  if (!was.moved) {
    const r = stage.getBoundingClientRect();
    const rx = r.left + (robotU - camU) * H, ry2 = r.top + ry * H - jy * H;
    if (Math.abs(was.x - rx) < ROBOT_H * H * .3 && was.y < ry2 && was.y > ry2 - ROBOT_H * H) { jump(); return; }
    const btn = was.target.closest && was.target.closest('.shop');
    const pill = was.target.closest && was.target.closest('.pill button');
    if (pill) { shopAction(+pill.dataset.i); }
    else if (btn) { const i = +btn.dataset.i; if (i === activeIdx) shopAction(i); else walkToShop(i, true); }
  }
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
// teclado/leitor de tela: foco em uma loja leva o robô até ela; Enter/clique abre
stage.addEventListener('focusin', e => {
  const b = e.target.closest && e.target.closest('.shop');
  if (b) walkToShop(+b.dataset.i, false);
});
stage.addEventListener('keydown', e => {
  const b = e.target.closest && e.target.closest('.shop');
  if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); shopAction(+b.dataset.i); }
});

/* ---------- seção de modelos ---------- */
function buildGrid() {
  SHOPS.forEach((s, i) => {
    const c = document.createElement('article'); c.className = 'card';
    const ready = READY.has(s.slug);
    c.innerHTML =
      '<div class="card-img"><img src="' + IMG('loja-' + s.slug) + '" alt="Fachada ilustrada da ' + s.kicker.toLowerCase() + ' ' + s.brand + '" loading="lazy"></div>' +
      '<div class="card-body"><span class="k">' + s.kicker + '</span><h3>' + s.brand + '</h3><p class="cd"><b>A dor</b>' + s.dor + '</p><p class="cs"><b>A solução</b>' + s.sol + '</p>' +
      '<button class="btn btn-ghost" type="button" data-i="' + i + '">Ver prévia</button></div>';
    grid.appendChild(c);
  });
  grid.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) openShop(+b.dataset.i); });
}

/* ---------- quem sou eu e contato (edite js/config.js) ---------- */
function buildAbout() {
  const t = document.getElementById('about-text');
  const nome = (CFG.nome || '').trim(), cidade = (CFG.cidade || '').trim(), hist = (CFG.historia || '').trim();
  const mk = txt => { const m = document.createElement('mark'); m.textContent = txt; return m; };
  t.textContent = '';
  t.appendChild(document.createTextNode('Oi, eu sou '));
  t.appendChild(nome ? document.createTextNode(nome) : mk('[seu nome]'));
  t.appendChild(document.createTextNode(cidade ? ', de ' + cidade + '. ' : ', de '));
  if (!cidade) { t.appendChild(mk('[sua cidade]')); t.appendChild(document.createTextNode('. ')); }
  if (hist) t.appendChild(document.createTextNode(hist));
  if (CFG.foto) {
    const ph = document.getElementById('photo');
    ph.textContent = ''; const im = document.createElement('img'); im.src = CFG.foto; im.alt = 'Foto de ' + (nome || 'quem criou o site'); ph.appendChild(im); ph.classList.add('has');
  }
}
function buildContact() {
  const a = document.getElementById('wa'), n = (CFG.whatsapp || '').replace(/\D/g, '');
  if (n) {
    const msg = CFG.mensagem || 'Oi! Vi o portfólio da Forja de inSITES e quero conversar sobre o site do meu negócio.';
    a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg); a.target = '_blank'; a.rel = 'noopener';
  } else {
    a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.classList.add('is-off'); a.textContent = 'WhatsApp em breve';
    document.getElementById('wa-note').hidden = false;
  }
}

/* ---------- inicialização ---------- */
let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const keep = H ? robotU : .5, act = activeIdx; activeIdx = -1;
    build(); robotU = clamp(keep, MINU, L - .5); lastRobot = robotU; setActive(act);
  }, 150);
});
new IntersectionObserver(es => { heroVisible = es[0].intersectionRatio > .35; if (es[0].intersectionRatio < .05) { textHidden = false; moved = false; if (crossed) { crossed = false; ry = ROBOT_FEET; stun = 0; } } }, { threshold:[0, .05, .35, .7, 1] }).observe(hero);

if (location.search.indexOf('debug') >= 0) window.__rua = { get cars() { return cars; }, st: () => ({ ry, robotU, stun, crossed, invul, airborne }) };
buildGrid(); buildAbout(); buildContact();
build();
requestAnimationFrame(tick);
// pequena pista visual: empurrãozinho ao carregar
const nudge = () => { if (!RM && !moved && !drag && targetU === null && !modalOpen) targetU = .72; };
if (!window.INTRO_OPEN) setTimeout(nudge, 900);
window.addEventListener('intro-end', () => setTimeout(nudge, 500));
})();
