import React, { useState } from 'react';
import { uid, fmt, num, godown, totalStock, totalValue, lowStock } from '../lib/model.js';
import { movementHtml } from '../lib/prints.js';
import { parseItemsCsv } from '../lib/csv.js';

export default function ItemsPanel({ store, update }) {
  const [edit, setEdit] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [q, setQ] = useState('');
  const cur = store.settings.currency;
  const low = new Set(lowStock(store).map(i => i.id));

  const save = () => update(s => {
    if (edit.id) Object.assign(s.items.find(x => x.id === edit.id), { ...edit, price: num(edit.price), min: num(edit.min) });
    else {
      s.counters.item = (s.counters.item || 0) + 1;
      s.items.push({ ...edit, id: uid('i'), code: `A-${String(s.counters.item).padStart(3, '0')}`, price: num(edit.price), min: num(edit.min), stock: {}, avgCost: {} });
    }
  }, 'save item');

  const doImport = async () => {
    const f = await window.api.app.openFile({ filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }] });
    if (!f?.text) return;
    setImportRows(parseItemsCsv(f.text));
  };
  const applyImport = () => update(s => {
    for (const r of importRows.rows) {
      s.counters.item = (s.counters.item || 0) + 1;
      s.items.push({ id: uid('i'), code: r.code || `A-${String(s.counters.item).padStart(3, '0')}`, name: r.name, unit: r.unit || 'pcs', price: r.price, min: r.min, stock: {}, avgCost: {} });
    }
  }, `import ${importRows.rows.length} items`);

  const list = (store.items || []).filter(i => !q || (i.name + ' ' + i.code).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="panel">
      <h2 className="ptitle">Items — آئٹمز</h2>
      <div className="frow" style={{ marginBottom: 10 }}>
        <input className="in" style={{ flex: 1 }} placeholder="Search name / code" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn small ghost" onClick={() => setEdit({ name: '', unit: 'pcs', price: '', min: '' })}>+ New item</button>
        <button className="btn small ghost" onClick={doImport}>Import CSV</button>
      </div>
      <table className="grid">
        <thead><tr><th>Code</th><th>Item</th><th>Unit</th>{(store.godowns || []).map(g => <th key={g.id} className="r">{g.name}</th>)}<th className="r">Total</th><th className="r">Value</th><th></th></tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} style={low.has(i.id) ? { background: '#fef2f2' } : {}}>
              <td>{i.code}</td>
              <td>{i.name}{low.has(i.id) ? ' ⚠ low' : ''}</td><td>{i.unit}</td>
              {(store.godowns || []).map(g => <td key={g.id} className="r">{num((i.stock || {})[g.id]).toLocaleString()}</td>)}
              <td className="r"><b>{totalStock(i).toLocaleString()}</b></td>
              <td className="r">{fmt(totalValue(i), cur)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: movementHtml(store, i.id), suggestedName: `movement-${i.code}.pdf` })}>Movement</button>
                <button className="btn small ghost" onClick={() => setEdit({ ...i })}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {edit && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <div className="frow">
            <input className="in" style={{ flex: 1 }} placeholder="Item name" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
            <input className="in" style={{ width: 90 }} placeholder="Unit" value={edit.unit} onChange={e => setEdit({ ...edit, unit: e.target.value })} />
            <label className="lbl">Sale price <input className="in" style={{ width: 110 }} type="number" value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} /></label>
            <label className="lbl">Min alert <input className="in" style={{ width: 90 }} type="number" value={edit.min} onChange={e => setEdit({ ...edit, min: e.target.value })} /></label>
            <button className="btn small" onClick={() => { save(); setEdit(null); }}>Save</button>
            <button className="btn small ghost" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}

      {importRows && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <b>{importRows.rows.length} items</b> parse hue — apply karein?
          {importRows.errors.map((e, i) => <div key={i} style={{ color: '#b45309', fontSize: 12 }}>⚠ {e}</div>)}
          <div className="frow" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => { applyImport(); setImportRows(null); }}>Apply import</button>
            <button className="btn small ghost" onClick={() => setImportRows(null)}>Cancel</button>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Columns: code, name, unit, price, min</div>
        </div>
      )}
    </div>
  );
}
