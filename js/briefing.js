/* Chat "Começar meu projeto": o Forjabô faz as perguntas do briefing, mostra um resumo,
   grava o pedido no banco (Supabase, schema forja) e termina com o botão que manda tudo no WhatsApp. */
(function () {
  'use strict';
  var CFG = window.SITE || {};
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SHOPS = (window.Forja && window.Forja.shops) || [];

  var TIPOS = [
    { v: 'Site simples', d: 'Vitrine do negócio: quem é, o que faz, onde fica e contato.' },
    { v: 'Agendamento online', d: 'O cliente marca horário sozinho, com sinal e avisos.' },
    { v: 'Marca e persona', d: 'Nome, identidade visual, mascote e jeito de falar.' },
    { v: 'Projeto personalizado', d: 'Algo sob medida: pedidos, painel, sistema interno…' }
  ];
  var FUNCOES = ['Agendar horários', 'Receber pedidos', 'Cardápio ou catálogo', 'Receber pagamento (PIX)', 'Aparecer no Google', 'Mostrar fotos e trabalhos', 'Falar no WhatsApp', 'Área do cliente'];
  var JA_TEM = ['Instagram', 'Site', 'Logo / identidade', 'Nada ainda'];

  var r = { nome: '', tipo_projeto: '', negocio: '', dor: '', funcoes: [], ja_tem: [], instagram: '', email: '', whatsapp: '', observacoes: '' };
  var aberto = false, iniciado = false, ocupado = false, enviadoId = null;

  /* ---------- montagem ---------- */
  var root = document.createElement('div');
  root.className = 'bf'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Começar meu projeto');
  root.innerHTML =
    '<div class="bf-fundo" data-fechar></div>' +
    '<div class="bf-janela">' +
      '<header class="bf-topo">' +
        '<img class="bf-av" src="assets/img/logo-face.webp" alt="" width="40" height="29">' +
        '<div class="bf-quem"><b>Forjabô</b><span class="bf-status">online</span></div>' +
        '<button type="button" class="bf-x" data-fechar aria-label="Fechar o chat">✕</button>' +
      '</header>' +
      '<div class="bf-msgs" aria-live="polite"></div>' +
      '<div class="bf-bandeja"></div>' +
      '<form class="bf-entrada" hidden><input class="bf-campo" autocomplete="off"><button type="submit" class="bf-enviar" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z"/></svg></button></form>' +
    '</div>';
  document.body.appendChild(root);
  var msgs = root.querySelector('.bf-msgs'), bandeja = root.querySelector('.bf-bandeja'), form = root.querySelector('.bf-entrada'),
      campo = root.querySelector('.bf-campo'), status = root.querySelector('.bf-status'), janela = root.querySelector('.bf-janela');

  /* ---------- utilidades ---------- */
  var dormir = function (ms) { return new Promise(function (ok) { setTimeout(ok, RM ? 0 : ms); }); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function rolar() { msgs.scrollTo({ top: msgs.scrollHeight, behavior: RM ? 'auto' : 'smooth' }); }
  function balao(de, html) {
    var b = document.createElement('div'); b.className = 'bf-b bf-' + de; b.innerHTML = html;
    msgs.appendChild(b); rolar(); return b;
  }
  async function falar() {                               // "digitando…" e depois cada mensagem
    for (var i = 0; i < arguments.length; i++) {
      var t = arguments[i];
      status.textContent = 'digitando…';
      var dig = balao('bot', '<span class="bf-dig"><i></i><i></i><i></i></span>'); dig.classList.add('bf-digitando');
      await dormir(650 + Math.min(900, String(t).replace(/<[^>]+>/g, '').length * 14));
      dig.remove(); status.textContent = 'online';
      balao('bot', t);
    }
  }
  function eu(t) { balao('eu', esc(t)); }
  function limpar() { bandeja.innerHTML = ''; form.hidden = true; }

  // botões de escolha única (devolve o valor tocado)
  function escolher(opcoes, extra) {
    limpar();
    return new Promise(function (ok) {
      opcoes.forEach(function (o) {
        var v = typeof o === 'string' ? o : o.v;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'bf-op' + (o.d ? ' bf-op-grande' : '');
        b.innerHTML = '<b>' + esc(v) + '</b>' + (o.d ? '<small>' + esc(o.d) + '</small>' : '');
        b.addEventListener('click', function () { limpar(); ok(v); });
        bandeja.appendChild(b);
      });
      if (extra) extra(bandeja);
      rolar();
    });
  }
  // várias escolhas + "Pronto"
  function marcar(opcoes, pre, exclusivo) {
    limpar();
    return new Promise(function (ok) {
      var sel = (pre || []).slice();
      var pronto = document.createElement('button'); pronto.type = 'button'; pronto.className = 'bf-pronto';
      function atualiza() { pronto.disabled = !sel.length; pronto.textContent = sel.length ? 'Pronto (' + sel.length + ')' : 'Marque uma ou mais'; }
      opcoes.forEach(function (v) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'bf-op bf-chk';
        b.textContent = v; b.setAttribute('aria-pressed', sel.indexOf(v) >= 0);
        b.addEventListener('click', function () {
          var k = sel.indexOf(v);
          if (k >= 0) sel.splice(k, 1);
          else { if (v === exclusivo) sel = []; else { var x = sel.indexOf(exclusivo); if (x >= 0) sel.splice(x, 1); } sel.push(v); }
          [].forEach.call(bandeja.querySelectorAll('.bf-chk'), function (c) { c.setAttribute('aria-pressed', sel.indexOf(c.textContent) >= 0); });
          atualiza();
        });
        bandeja.appendChild(b);
      });
      pronto.addEventListener('click', function () { if (!sel.length) return; limpar(); ok(sel); });
      bandeja.appendChild(pronto); atualiza(); rolar();
    });
  }
  // texto livre, com validação; "pular" opcional
  function digitar(o) {
    limpar();
    return new Promise(function (ok) {
      form.hidden = false;
      campo.value = o.valor || ''; campo.placeholder = o.dica || 'Escreva aqui…';
      campo.type = o.tipo || 'text'; campo.inputMode = o.modo || 'text'; campo.autocomplete = o.auto || 'off';
      if (o.pular) {
        var p = document.createElement('button'); p.type = 'button'; p.className = 'bf-op bf-pular'; p.textContent = o.pular;
        p.addEventListener('click', function () { form.onsubmit = null; limpar(); ok(''); });
        bandeja.appendChild(p);
      }
      form.onsubmit = function (e) {
        e.preventDefault();
        var v = campo.value.trim();
        if (o.formata) v = o.formata(v);
        var erro = o.valida ? o.valida(v) : (v ? '' : 'Escreva para continuar.');
        if (erro) { campo.setCustomValidity(erro); campo.reportValidity(); campo.setCustomValidity(''); return; }
        form.onsubmit = null; limpar(); ok(v);
      };
      setTimeout(function () { campo.focus({ preventScroll: true }); }, 30);
      rolar();
    });
  }
  var foneBR = function (v) { var d = v.replace(/\D/g, ''); if (d.length === 13 && d.indexOf('55') === 0) d = d.slice(2); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : v; };
  var primeiroNome = function () { return esc(r.nome.split(' ')[0]); };

  /* ---------- perguntas (cada uma pode ser refeita pelo "Editar") ---------- */
  var P = {
    nome: async function () {
      await falar('Como você se chama?');
      r.nome = await digitar({ dica: 'Seu nome', auto: 'name', valor: r.nome, valida: function (v) { return v.length >= 2 ? '' : 'Escreva seu nome.'; } });
      eu(r.nome);
    },
    tipo: async function () {
      await falar('Prazer, ' + primeiroNome() + '! 👋 Que tipo de projeto você quer criar?');
      r.tipo_projeto = await escolher(TIPOS); eu(r.tipo_projeto);
    },
    negocio: async function () {
      await falar('Qual é o seu negócio?');
      var ops = SHOPS.map(function (s) { return s.kicker; }).concat(['Outro']);
      var v = await escolher(ops);
      if (v === 'Outro') { eu('Outro'); await falar('Me conta: qual é o seu negócio ou o que você faz?'); v = await digitar({ dica: 'Ex.: clínica de estética, escritório de advocacia…', valor: '' }); }
      r.negocio = v; eu(v);
    },
    dor: async function () {
      var s = SHOPS.filter(function (x) { return x.kicker === r.negocio; })[0];
      await falar('Hoje, o que mais dá trabalho ou faz você perder cliente? E como você quer usar o site?');
      var v = s ? await escolher([s.dor, 'Outra coisa']) : 'Outra coisa';
      if (v === 'Outra coisa') { if (s) eu(v); await falar('Escreve com as suas palavras 🙂'); v = await digitar({ dica: 'Ex.: perco cliente porque demoro para responder no WhatsApp', valor: r.dor }); }
      r.dor = v; eu(v);
    },
    funcoes: async function () {
      await falar('O que o site precisa fazer? Pode marcar mais de um.');
      r.funcoes = await marcar(FUNCOES, r.funcoes); eu(r.funcoes.join(', '));
    },
    ja_tem: async function () {
      await falar('Você já tem alguma coisa pronta?');
      r.ja_tem = await marcar(JA_TEM, r.ja_tem, 'Nada ainda'); eu(r.ja_tem.join(', '));
      if (r.ja_tem.indexOf('Instagram') >= 0) {
        await falar('Qual é o @ do Instagram?');
        r.instagram = await digitar({ dica: '@seunegocio', valor: r.instagram, formata: function (v) { v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?].*$/, ''); return v ? '@' + v.replace(/^@+/, '') : ''; } });
        eu(r.instagram);
      } else r.instagram = '';
    },
    email: async function () {
      await falar('Qual é o seu e-mail?');
      r.email = await digitar({ tipo: 'email', modo: 'email', auto: 'email', dica: 'voce@email.com', valor: r.email, valida: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Confira o e-mail.'; } });
      eu(r.email);
    },
    whatsapp: async function () {
      await falar('E o seu WhatsApp, com DDD?');
      r.whatsapp = await digitar({ tipo: 'tel', modo: 'tel', auto: 'tel', dica: '(11) 91234-5678', valor: r.whatsapp, formata: foneBR, valida: function (v) { var d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 11 ? '' : 'Confira o número com DDD.'; } });
      eu(r.whatsapp);
    },
    observacoes: async function () {
      await falar('Quer contar mais alguma coisa? Uma ideia, um site que você gosta, um prazo…');
      r.observacoes = await digitar({ dica: 'Opcional', valor: r.observacoes, pular: 'Não, tudo certo', valida: function () { return ''; } });
      eu(r.observacoes || 'Não, tudo certo');
    }
  };
  var ORDEM = ['nome', 'tipo', 'negocio', 'dor', 'funcoes', 'ja_tem', 'email', 'whatsapp', 'observacoes'];
  var ROTULO = { nome: 'Nome', tipo: 'Projeto', negocio: 'Negócio', dor: 'O que resolver', funcoes: 'O site precisa', ja_tem: 'Já tem', email: 'E-mail', whatsapp: 'WhatsApp', observacoes: 'Observações' };
  function valorDe(k) {
    if (k === 'tipo') return r.tipo_projeto;
    if (k === 'funcoes') return r.funcoes.join(', ');
    if (k === 'ja_tem') return r.ja_tem.join(', ') + (r.instagram ? ' (' + r.instagram + ')' : '');
    return r[k];
  }

  /* ---------- resumo, envio e WhatsApp ---------- */
  function textoResumo() {
    var l = ['Oi, Vitor! Vim pelo site da Forja de inSITES. Este é o resumo do meu projeto:', ''];
    ORDEM.forEach(function (k) { var v = valorDe(k); if (v) l.push('• ' + ROTULO[k] + ': ' + v); });
    if (enviadoId) l.push('', 'Pedido nº ' + enviadoId);
    return l.join('\n');
  }
  function linkWhats() {
    var n = (CFG.whatsapp || '').replace(/\D/g, '');
    return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(textoResumo()) : '';
  }
  async function resumo() {
    await falar('Pronto, ' + primeiroNome() + '! Confere se está tudo certo:');
    var b = balao('bot', '<div class="bf-resumo">' + ORDEM.map(function (k) {
      var v = valorDe(k); if (!v) return '';
      return '<div class="bf-linha"><span>' + ROTULO[k] + '</span><b>' + esc(v) + '</b></div>';
    }).join('') + '</div>');
    b.classList.add('bf-largo');
    var v = await escolher([{ v: 'Está tudo certo, enviar' }, { v: 'Editar alguma coisa' }]);
    if (v === 'Editar alguma coisa') {
      eu('Quero editar');
      await falar('O que você quer mudar?');
      var ops = ORDEM.map(function (k) { return ROTULO[k]; });
      var qual = await escolher(ops);
      var k = ORDEM[ops.indexOf(qual)];
      eu(qual);
      await P[k]();
      if (k === 'negocio') await P.dor();                     // trocou o negócio: as opções de dor mudam
      return resumo();
    }
    eu('Está tudo certo, enviar');
    await enviar();
  }
  async function enviar() {
    status.textContent = 'enviando…';
    try {
      var url = (CFG.supabaseUrl || '').replace(/\/$/, ''), key = CFG.supabaseAnonKey || '';
      if (!url || !key) throw new Error('sem banco');
      var res = await fetch(url + '/rest/v1/rpc/forja_enviar_lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
        body: JSON.stringify({ dados: r })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      enviadoId = await res.json();
    } catch (e) { enviadoId = null; }
    status.textContent = 'online';
    if (enviadoId) await falar('Recebido! ✅ Seu pedido é o nº <b>' + enviadoId + '</b>.', 'Agora toque no botão abaixo para me mandar o resumo no WhatsApp. A mensagem já vai pronta, é só enviar. 🚀');
    else await falar('Agora toque no botão abaixo para me mandar o resumo no WhatsApp. A mensagem já vai pronta, é só enviar. 🚀');
    final();
  }
  function final() {
    limpar();
    var w = linkWhats();
    var a = document.createElement('a'); a.className = 'bf-whats'; a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 8.8c.3 2.6 2.1 4.6 4.7 5.3l1-1.2 1.9.9c-.2 1-1 1.7-2 1.7-3.5-.2-6.4-3.1-6.6-6.6 0-1 .7-1.8 1.7-2l.9 1.9z"/></svg> Enviar resumo no WhatsApp';
    if (w) a.href = w; else { a.removeAttribute('href'); a.classList.add('is-off'); }
    bandeja.appendChild(a);
    var de = document.createElement('button'); de.type = 'button'; de.className = 'bf-op bf-pular'; de.textContent = 'Começar de novo';
    de.addEventListener('click', function () { if (!ocupado) recomecar(); });
    bandeja.appendChild(de);
    rolar();
  }
  async function conversa() {
    ocupado = true;
    await falar('Oi! Eu sou o Forjabô 🤖', 'Vou te fazer umas perguntas rápidas para o Vitor entender o seu projeto. Leva uns 2 minutos.');
    for (var i = 0; i < ORDEM.length; i++) await P[ORDEM[i]]();
    await resumo();
    ocupado = false;
  }
  function recomecar() {
    msgs.innerHTML = ''; enviadoId = null;
    r = { nome: r.nome, tipo_projeto: '', negocio: '', dor: '', funcoes: [], ja_tem: [], instagram: '', email: r.email, whatsapp: r.whatsapp, observacoes: '' };
    conversa();
  }

  /* ---------- abrir / fechar ---------- */
  var antes = null;
  function abrir(tipo) {
    if (aberto) return;
    aberto = true; antes = document.activeElement;
    root.hidden = false; document.documentElement.classList.add('bf-aberto');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('on'); }); });
    if (!iniciado) { iniciado = true; if (tipo) r.tipo_projeto = tipo; conversa(); }
    setTimeout(function () { var f = root.querySelector('.bf-op, .bf-campo:not([hidden])'); (f || root.querySelector('.bf-x')).focus({ preventScroll: true }); }, 380);
  }
  function fechar() {
    if (!aberto) return;
    aberto = false; root.classList.remove('on'); document.documentElement.classList.remove('bf-aberto');
    setTimeout(function () { if (!aberto) root.hidden = true; }, 260);
    if (antes && antes.focus) antes.focus({ preventScroll: true });
  }
  root.addEventListener('click', function (e) { if (e.target.closest('[data-fechar]')) fechar(); });
  window.addEventListener('keydown', function (e) { if (aberto && e.key === 'Escape') fechar(); });
  // teclado do celular: a janela acompanha a área visível
  if (window.visualViewport) visualViewport.addEventListener('resize', function () {
    if (!aberto) return;
    janela.style.height = Math.round(visualViewport.height) + 'px'; rolar();
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-briefing]');
    if (!b) return;
    e.preventDefault(); abrir(b.getAttribute('data-briefing') || '');
  });
  // pré-escolha do tipo (botão da seção de agendamento): pula a pergunta do tipo
  var tipoOriginal = P.tipo;
  P.tipo = async function () {
    if (r.tipo_projeto && !P.tipo.feito) { P.tipo.feito = true; await falar('Prazer, ' + primeiroNome() + '! 👋 Anotei que você quer <b>' + esc(r.tipo_projeto) + '</b>.'); return; }
    return tipoOriginal();
  };
  window.Briefing = { abrir: abrir, fechar: fechar };
})();
