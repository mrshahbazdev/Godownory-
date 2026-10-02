import React, { useState } from 'react';
import { uid } from '../lib/model.js';
import { stockHtml } from '../lib/prints.js';

export default function GodownsPanel({ store, update }) {
  const [g, setG] = useState(null);
  return (
    <div className="panel">
      <h2 className="ptitle">Godowns — گودام</h2>
      <table className="grid" style={{ marginBottom: 10 }}>
        <thead><tr><th>Godown</th><th>Address</th><th className="r">Items held</th><th className="r">Value</th><th></th></tr></thead>
        <tbody>
          {(store.godowns || []).map(x => {
            const rows = (store.items || []).filter(i => ((i.stock || {})[x.id] || 0) > 0);
            const val = rows.reduce((t, i) => t + (i.stock[x.id] || 0) * ((i.avgCost || {})[x.id] || 0), 0);
            return (
              <tr key={x.id}>
                <td>{x.name}</td><td>{x.address}</td>
                <td className="r">{rows.length}</td><td className="r">{val.toLocaleString()}</td>
                <td>
                  <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: stockHtml(store, x.id), suggestedName: `stock-${x.name}.pdf` })}>Stock report</button>
                  <button className="btn small ghost" onClick={() => setG({ ...x })}>Edit</button>
                  <button className="icon" onClick={() => { if (confirm('Remove godown? Stock rows keep their godown id.')) update(s => s.godowns = s.godowns.filter(z => z.id !== x.id), 'remove godown'); }}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="btn small ghost" onClick={() => setG({ name: '', address: '' })}>+ New godown</button>
      {g && (
        <div className="pcard" style={{ marginTop: 10 }}>
          <div className="frow">
            <input className="in" style={{ flex: 1 }} placeholder="Godown name" value={g.name} onChange={e => setG({ ...g, name: e.target.value })} />
            <input className="in" style={{ flex: 1 }} placeholder="Address" value={g.address} onChange={e => setG({ ...g, address: e.target.value })} />
            <button className="btn small" onClick={() => {
              if (!g.name) return;
              update(s => { if (g.id) Object.assign(s.godowns.find(z => z.id === g.id), g); else s.godowns.push({ ...g, id: uid('g') }); }, 'save godown');
              setG(null);
            }}>Save</button>
            <button className="btn small ghost" onClick={() => setG(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
