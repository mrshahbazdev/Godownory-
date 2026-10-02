import React from 'react';
import { fmt, num, monthSummary, lowStock, stockReport, today } from '../lib/model.js';

export default function Dashboard({ store, go }) {
  const m = today().slice(0, 7);
  const sum = monthSummary(store, m);
  const low = lowStock(store);
  const rows = stockReport(store, null);
  const stockVal = rows.reduce((t, r) => t + r.value, 0);
  const todayCh = (store.challans || []).filter(c => c.date === today() && c.status !== 'void');
  return (
    <div className="panel">
      <h2 className="ptitle">Dashboard — {m}</h2>
      <div className="cards">
        <div className="pcard"><div className="clabel">Items in stock</div><div className="cval">{rows.filter(r => r.qty > 0).length}</div></div>
        <div className="pcard"><div className="clabel">Stock valuation</div><div className="cval">{fmt(stockVal, store.settings.currency)}</div></div>
        <div className="pcard"><div className="clabel">Challans today</div><div className="cval">{todayCh.length}</div></div>
        <div className="pcard"><div className="clabel">Received this month</div><div className="cval">{fmt(sum.received, store.settings.currency)}</div><div className="muted">paid {fmt(sum.paid, store.settings.currency)}</div></div>
        <div className="pcard" style={{ borderColor: low.length ? '#dc2626' : undefined }}><div className="clabel">Low stock alerts</div><div className="cval">{low.length}</div></div>
        <div className="pcard"><div className="clabel">Godowns</div><div className="cval">{(store.godowns || []).length}</div></div>
      </div>

      {low.length > 0 && (
        <>
          <h3 className="ptitle" style={{ fontSize: 15, marginTop: 18 }}>Low stock</h3>
          <table className="grid">
            <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Min</th></tr></thead>
            <tbody>
              {low.map(i => <tr key={i.id}><td>{i.name}</td><td className="r" style={{ color: '#dc2626', fontWeight: 700 }}>{Object.values(i.stock || {}).reduce((t, q) => t + num(q), 0)}</td><td className="r">{i.min}</td></tr>)}
            </tbody>
          </table>
        </>
      )}
      <div className="frow" style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => go('challans')}>New challan</button>
        <button className="btn ghost" onClick={() => go('payments')}>Receipt / payment</button>
        <button className="btn ghost" onClick={() => go('reports')}>Reports</button>
      </div>
    </div>
  );
}
