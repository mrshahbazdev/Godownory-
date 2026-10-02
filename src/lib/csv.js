const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function csvText(rows) {
  return rows.map(r => r.map(q).join(',')).join('\n');
}

export function itemsCsv(store) {
  const rows = [['code', 'name', 'unit', 'price', 'min', 'total_qty', 'total_value']];
  const tot = it => Object.values(it.stock || {}).reduce((t, q) => t + (q || 0), 0);
  const val = it => Object.entries(it.stock || {}).reduce((t, [g, q]) => t + (q || 0) * ((it.avgCost || {})[g] || 0), 0);
  for (const it of store.items || []) rows.push([it.code, it.name, it.unit, it.price, it.min, tot(it), val(it)]);
  return csvText(rows);
}

export function parseItemsCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const errors = [], rows = [];
  const start = /name/i.test(lines[0] || '') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    const [code, name, unit, price, min] = cells;
    if (!name) { errors.push(`Row ${i + 1}: name missing — skipped`); continue; }
    rows.push({ code, name, unit, price: Number(price) || 0, min: Number(min) || 0 });
  }
  return { rows, errors };
}
