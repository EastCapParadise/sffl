// ============================================================
// SFFL - Sortable Table Utility
// ============================================================

function makeSortable(tableEl) {
  if (!tableEl) return;

  const theadRow = tableEl.querySelector('thead tr');
  if (!theadRow) return;

  // Replace th elements to clear any existing sort listeners
  Array.from(theadRow.querySelectorAll('th')).forEach(th => {
    theadRow.replaceChild(th.cloneNode(true), th);
  });

  const ths = Array.from(theadRow.querySelectorAll('th'));
  let sortCol = -1, sortAsc = true;

  ths.forEach((th, colIdx) => {
    th.classList.add('th-sortable');
    th.addEventListener('click', () => {
      if (sortCol === colIdx) {
        sortAsc = !sortAsc;
      } else {
        sortCol = colIdx;
        sortAsc = true;
      }
      ths.forEach(h => h.classList.remove('th-sort-asc', 'th-sort-desc'));
      th.classList.add(sortAsc ? 'th-sort-asc' : 'th-sort-desc');

      const tbody = tableEl.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.sort((a, b) => {
        const aText = (a.cells[colIdx]?.textContent ?? '').trim();
        const bText = (b.cells[colIdx]?.textContent ?? '').trim();
        const aVal = parseSortVal(aText);
        const bVal = parseSortVal(bText);
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortAsc ? aVal - bVal : bVal - aVal;
        }
        return sortAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
      });
      rows.forEach(r => tbody.appendChild(r));
    });
  });
}

function parseSortVal(text) {
  const s = text.replace(/🏆\s*/g, '').replace(/🪵\s*/g, '').replace(/^\+/, '').replace(/%$/, '').replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? s : n;
}
