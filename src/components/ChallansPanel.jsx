import React, { useState } from 'react';
import { fmt, num, godown, party, item, totalStock, postChallan, voidChallan, today, ym } from '../lib/model.js';
import { challanHtml } from '../lib/prints.js';

export default function ChallansPanel({ store, update, user }) {
  const [form, setForm] = useState(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [type, setType] = useState('all');
  const cur = store.settings.currency;
  const canPost = !user || ['owner', 'manager', 'keeper'].includes(user.role);

  const list = (store.challans || []).filter(c => ym(c.date) === month && (type === 'all' || c.type === type)).sort((a, b) => b.no - a.no);

  const newForm = t => setForm({
    type: t, date: today(), party_id: '',
    from_godown: store.godowns[0]?.id || '', to_godown: store.godowns[0]?.id || '',
    note: '', items: [{ item_id: '', qty: 1, rate: '' }]
  });
  const addLine = () => setForm({ ...form, items: [...form.items, { item_id: '', qty: 1, rate: '' }] });
  const setLine = (i, k, v) => {
    const items = form.items.slice();
    items[i] = { ...items[i], [k]: v };
    if (k === 'item_id') { const it = item(store, v); if (it) items[i].rate = form.type === 'out' ? it.price : ''; }
    setForm({ ...form, items });
  };

  const post = () => {
    const items = form.items.filter(i => i.item_id && num(i.qty) > 0);
    if (!items.length) return;
    if (form.type === 'in' && !form.to_godown) return;
    if (form.type === 'out' && !form.from_godown) return;
    if (form.type === 'transfer' && (!form.from_godown || !form.to_godown || form.from_godown === form.to_godown)) return;
    update(s => postChallan(s, { ...form, items }, user?.name || 'app'), `${form.type} challan`);
    setForm(null);
  };

  const partyOpts = form ? (store.parties || []).filter(p => form.type === 'in' ? p.type === 'supplier' : p.type === 'customer') : [];

  return (
    <div className="panel">
      <div className="frow" style={{ alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0, flex: 1 }}>Challans — {month}</h2>
        <input className="in" type="month" value={month} onChange={e => setMonth(e.target.value)} />
        <select className="in" value={type} onChange={e => setType(e.target.value)}>
          <option value="all">All</option><option value="in">In</option><option value="out">Out</option><option value="transfer">Transfer</option>
        </select>
        {canPost && <button className="btn" onClick={() => newForm('in')}>+ In</button>}
        {canPost && <button className="btn" onClick={() => newForm('out')}>+ Out</button>}
        {canPost && <button className="btn ghost" onClick={() => newForm('transfer')}>+ Transfer</button>}
      </div>

      {form && (
        <div className="pcard" style={{ marginTop: 10, marginBottom: 10 }}>
          <b>{form.type === 'in' ? 'Goods in (supplier → godown)' : form.type === 'out' ? 'Goods out (godown → customer)' : 'Transfer (godown → godown)'}</b>
          <div className="frow" style={{ marginTop: 8 }}>
            <label className="lbl">Date <input className="in" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            {form.type !== 'transfer' && (
              <select className="in" style={{ flex: 1 }} value={form.party_id} onChange={e => setForm({ ...form, party_id: e.target.value })}>
                <option value="">— {form.type === 'in' ? 'supplier' : 'customer'} —</option>
                {partyOpts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {form.type !== 'in' && (
              <label className="lbl">From <select className="in" value={form.from_godown} onChange={e => setForm({ ...form, from_godown: e.target.value })}>
                {(store.godowns || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select></label>
            )}
            {form.type !== 'out' && (
              <label className="lbl">To <select className="in" value={form.to_godown} onChange={e => setForm({ ...form, to_godown: e.target.value })}>
                {(store.godowns || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select></label>
            )}
            <input className="in" style={{ flex: 1 }} placeholder="Note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          <table className="grid" style={{ marginTop: 8 }}>
            <thead><tr><th>Item</th><th className="r">Stock</th><th>Qty</th><th className="r">Rate</th><th></th></tr></thead>
            <tbody>
              {form.items.map((ln, i) => {
                const it = item(store, ln.item_id);
                const avail = it && form.type !== 'in' ? num((it.stock || {})[form.from_godown]) : null;
                return (
                  <tr key={i}>
                    <td>
                      <select className="in" value={ln.item_id} onChange={e => setLine(i, 'item_id', e.target.value)}>
                        <option value="">— item —</option>
                        {(store.items || []).map(x => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}
                      </select>
                    </td>
                    <td className="r">{avail !== null ? avail.toLocaleString() : '—'}</td>
                    <td><input className="in" style={{ width: 80 }} type="number" min="1" value={ln.qty} onChange={e => setLine(i, 'qty', e.target.value)} /></td>
                    <td><input className="in" style={{ width: 110 }} type="number" value={ln.rate} onChange={e => setLine(i, 'rate', e.target.value)} /></td>
                    <td><button className="icon" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="frow" style={{ marginTop: 8 }}>
            <button className="btn small ghost" onClick={addLine}>+ line</button>
            <span className="muted">Total: {fmt(form.items.reduce((t, i) => t + num(i.rate) * num(i.qty), 0), cur)}</span>
            <button className="btn small" onClick={post}>Post challan</button>
            <button className="btn small ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="grid">
        <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Party</th><th>From → To</th><th className="r">Lines</th><th className="r">Amount</th><th>By</th><th></th></tr></thead>
        <tbody>
          {list.map(c => {
            const p = c.party_id ? party(store, c.party_id) : null;
            return (
              <tr key={c.id} className={c.status === 'void' ? 'muted' : ''}>
                <td>{c.no}</td><td>{c.date}</td>
                <td><span className={'tag ' + (c.type === 'out' ? 'warn' : 'ok')}>{c.type}</span></td>
                <td>{p?.name || '—'}</td>
                <td>{[c.from_godown ? godown(store, c.from_godown)?.name : null, c.to_godown ? godown(store, c.to_godown)?.name : null].filter(Boolean).join(' → ') || '—'}</td>
                <td className="r">{c.items.length}</td>
                <td className="r">{c.status === 'void' ? 'VOID' : fmt(c.amount, cur)}</td>
                <td>{c.by}</td>
                <td>
                  <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: challanHtml(store, c), suggestedName: `challan-${c.no}.pdf` })}>3-part</button>
                  {c.status !== 'void' && canPost && <button className="icon" title="Void challan (stock reversed)" onClick={() => { const x = prompt('Void reason (challan + stock reversed, row kept):'); if (x !== null) update(s => voidChallan(s, c.id, x), `void challan #${c.no}`); }}>✕</button>}
                </td>
              </tr>
            );
          })}
          {!list.length && <tr><td colSpan="9" className="muted">No challans this month.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
