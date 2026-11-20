/* "Além do site" no celular: os blocos mostram só ícone + título; tocar mostra o texto daquele bloco embaixo (um por vez). */
(function () {
  var sec = document.getElementById('agenda'); if (!sec) return;
  var cards = [].slice.call(sec.querySelectorAll('.ag-grid article')), det = sec.querySelector('.ag-det');
  if (!cards.length || !det) return;
  var cur = -1;
  function abrir(i) {
    if (i === cur) return;
    cur = i;
    cards.forEach(function (c, k) { c.classList.toggle('on', k === i); c.setAttribute('aria-expanded', k === i); });
    det.textContent = cards[i].querySelector('p').textContent;
    det.classList.remove('troca'); void det.offsetWidth; det.classList.add('troca');
  }
  cards.forEach(function (c, i) {
    c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0');
    c.addEventListener('click', function () { abrir(i); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(i); } });
  });
  abrir(0);
})();
