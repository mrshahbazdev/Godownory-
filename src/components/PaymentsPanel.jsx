import React, { useState } from 'react';
import { fmt, num, party, receivePayment, voidReceipt, today, ym } from '../lib/model.js';
import { receiptHtml } from '../lib/prints.js';

export default function PaymentsPanel({ store, update, user }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [pay, setPay] = useState(null);
  const cur = store.settings.currency;
  const canMoney = !user || ['owner', 'manager'].includes(user.role);

  const receipts = (store.receipts || []).filter(r => ym(r.date) === month).sort((a, b) => b.no - a.no);

  const doPay = () => {
    if (!num(pay.amount) || !pay.party_id) return;
    update(s => receivePayment(s, { party_id: pay.party_id, amount: num(pay.amount), direction: pay.direction, mode: pay.mode, ref: pay.ref, date: pay.date }, user?.name || 'app'), `receipt — ${party(store, pay.party_id)?.name}`);
    setPay(null);
  };

  const opts = pay ? (store.parties || []).filter(p => pay.direction === 'out' ? p.type === 'supplier' : p.type === 'customer') : [];

  return (
    <div className="panel">
      <div className="frow" style={{ alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0, flex: 1 }}>Receipts & payments — {month}</h2>
        <input className="in" type="month" value={month} onChange={e => setMonth(e.target.value)} />
        {canMoney && <button className="btn" onClick={() => setPay({ direction: 'in', party_id: '', amount: '', date: today(), mode: 'cash', ref: '' })}>+ Received</button>}
        {canMoney && <button className="btn ghost" onClick={() => setPay({ direction: 'out', party_id: '', amount: '', date: today(), mode: 'cash', ref: '' })}>+ Paid out</button>}
      </div>

      {pay && (
        <div className="pcard" style={{ marginTop: 10, marginBottom: 10 }}>
          <b>{pay.direction === 'out' ? 'Payment to supplier' : 'Receipt from customer'}</b>
          <div className="frow" style={{ marginTop: 6 }}>
            <select className="in" style={{ flex: 1 }} value={pay.party_id} onChange={e => setPay({ ...pay, party_id: e.target.value })}>
              <option value="">— {pay.direction === 'out' ? 'supplier' : 'customer'} —</option>
              {opts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="lbl">Amount <input className="in" style={{ width: 120 }} type="number" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></label>
            <label className="lbl">Date <input className="in" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} /></label>
            <select className="in" value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}>
              {['cash', 'bank', 'online', 'cheque'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input className="in" placeholder="Ref" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} />
            <button className="btn small" onClick={doPay}>Save</button>
            <button className="btn small ghost" onClick={() => setPay(null)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="grid">
        <thead><tr><th>#</th><th>Date</th><th>Party</th><th>Direction</th><th>Mode</th><th className="r">Amount</th><th>By</th><th></th></tr></thead>
        <tbody>
          {receipts.map(r => {
            const p = party(store, r.party_id) || {};
            return (
              <tr key={r.id} className={r.status === 'void' ? 'muted' : ''}>
                <td>{r.no}</td><td>{r.date}</td><td>{p.name}</td>
                <td><span className={'tag ' + (r.direction === 'in' ? 'ok' : 'warn')}>{r.direction === 'in' ? 'received' : 'paid'}</span></td>
                <td>{r.mode}{r.ref ? ' · ' + r.ref : ''}</td>
                <td className="r">{r.status === 'void' ? 'VOID' : fmt(r.amount, cur)}</td><td>{r.by}</td>
                <td>
                  <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: receiptHtml(store, r), suggestedName: `voucher-${r.no}.pdf` })}>Print</button>
                  {r.status !== 'void' && canMoney && <button className="icon" title="Void" onClick={() => { const x = prompt('Void reason (row kept):'); if (x !== null) update(s => voidReceipt(s, r.id, x), `void voucher #${r.no}`); }}>✕</button>}
                </td>
              </tr>
            );
          })}
          {!receipts.length && <tr><td colSpan="8" className="muted">No vouchers this month.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
