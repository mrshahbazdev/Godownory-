import React, { useState } from 'react';
import { uid, fmt, party, partyBalance, waLink } from '../lib/model.js';
import { partyStatementHtml } from '../lib/prints.js';

export default function PartiesPanel({ store, update }) {
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(null);
  const [type, setType] = useState('customer');
  const [q, setQ] = useState('');
  const cur = store.settings.currency;

  const save = () => update(s => {
    if (edit.id) Object.assign(s.parties.find(x => x.id === edit.id), edit);
    else {
      s.counters.party = (s.counters.party || 0) + 1;
      s.parties.push({ ...edit, id: uid('p'), type: edit.type || type });
    }
  }, 'save party');

  const detail = open ? party(store, open) : null;
  const remind = (p) => {
    const url = waLink(p.whatsapp || p.phone, `Assalam-o-alaikum ${p.name}, aap ka ${store.settings.companyName || ''} balance ${fmt(partyBalance(store, p.id), cur)} hai.`);
    if (url) window.open(url, '_blank');
  };

  const list = (store.parties || []).filter(p => p.type === type && (!q || (p.name + ' ' + (p.phone || '')).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="panel">
      <div className="frow" style={{ alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0, flex: 1 }}>{type === 'supplier' ? 'Suppliers — سپلائر' : 'Customers — کسٹمر'}</h2>
        <select className="in" value={type} onChange={e => setType(e.target.value)}>
          <option value="customer">Customers</option><option value="supplier">Suppliers</option>
        </select>
        <input className="in" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn small ghost" onClick={() => setEdit({ type, name: '', phone: '', whatsapp: '', address: '' })}>+ New</button>
      </div>
      <table className="grid" style={{ marginTop: 10 }}>
        <thead><tr><th>Name</th><th>Phone</th><th className="r">Balance</th><th></th></tr></thead>
        <tbody>
          {list.map(p => {
            const bal = partyBalance(store, p.id);
            return (
              <tr key={p.id}>
                <td><a href="#" onClick={e => { e.preventDefault(); setOpen(p.id); }}>{p.name}</a></td>
                <td>{p.phone}</td>
                <td className="r" style={{ color: bal !== 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  {bal ? fmt(Math.abs(bal), cur) : '✓'} {bal > 0 ? (p.type === 'supplier' ? 'payable' : 'receivable') : ''}
                </td>
                <td>
                  <button className="btn small ghost" onClick={() => remind(p)}>WhatsApp</button>
                  <button className="btn small ghost" onClick={() => setEdit({ ...p })}>Edit</button>
                </td>
              </tr>
            );
          })}
          {!list.length && <tr><td colSpan="4" className="muted">No {type}s.</td></tr>}
        </tbody>
      </table>

      {edit && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <div className="frow">
            <input className="in" style={{ flex: 1 }} placeholder="Name" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
            <input className="in" placeholder="Phone" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
            <input className="in" placeholder="WhatsApp" value={edit.whatsapp || ''} onChange={e => setEdit({ ...edit, whatsapp: e.target.value })} />
            <input className="in" style={{ flex: 1 }} placeholder="Address" value={edit.address || ''} onChange={e => setEdit({ ...edit, address: e.target.value })} />
            <button className="btn small" onClick={() => { save(); setEdit(null); }}>Save</button>
            <button className="btn small ghost" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}

      {detail && (
        <div className="pcard" style={{ marginTop: 14 }}>
          <div className="frow" style={{ justifyContent: 'space-between' }}>
            <b>{detail.name} — ledger</b>
            <span>
              <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: partyStatementHtml(store, detail), suggestedName: `ledger-${detail.name}.pdf` })}>Print statement</button>
              <button className="btn small ghost" onClick={() => setOpen(null)}>Close</button>
            </span>
          </div>
          <table className="grid" style={{ marginTop: 8 }}>
            <thead><tr><th>Date</th><th>Entry</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {[...(store.challans || []).filter(c => c.party_id === detail.id).map(c => ({ date: c.date, desc: `Challan #${c.no} (${c.type})`, amt: c.amount, void: c.status === 'void' })),
                ...(store.receipts || []).filter(r => r.party_id === detail.id).map(r => ({ date: r.date, desc: `${r.direction === 'out' ? 'Paid' : 'Received'} #${r.no}`, amt: -r.amount, void: r.status === 'void' }))]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((x, i) => <tr key={i} className={x.void ? 'muted' : ''}><td>{x.date}</td><td>{x.desc}{x.void ? ' (void)' : ''}</td><td className="r">{x.void ? '—' : x.amt.toLocaleString()}</td></tr>)}
              <tr><td colSpan="2"><b>Balance</b></td><td className="r"><b>{fmt(partyBalance(store, detail.id), cur)}</b></td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
