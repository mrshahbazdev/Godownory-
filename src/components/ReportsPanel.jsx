import React, { useState } from 'react';
import { fmt, num, monthSummary, addMonths, stockReport, lowStock, partyBalance, today } from '../lib/model.js';
import { stockHtml } from '../lib/prints.js';

export default function ReportsPanel({ store }) {
  const cur = store.settings.currency;
  const m0 = today().slice(0, 7);
  const [gFilter, setGFilter] = useState('');
  const months = [...Array(6)].map((_, i) => addMonths(m0, -i)).reverse();
  const trend = months.map(m => ({ m, ...monthSummary(store, m) }));
  const rows = stockReport(store, gFilter || null);
  const stockVal = rows.reduce((t, r) => t + r.value, 0);
  const owing = (store.parties || []).map(p => ({ p, bal: partyBalance(store, p.id) })).filter(x => x.bal !== 0).sort((a, b) => b.bal - a.bal);
  const topMovers = {};
  for (const ch of store.challans || []) if (ch.status !== 'void') for (const ln of ch.items) topMovers[ln.item_id] = (topMovers[ln.item_id] || 0) + ln.qty;
  const top = Object.entries(topMovers).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="panel">
      <h2 className="ptitle">Reports</h2>
      <div className="frow" style={{ marginBottom: 14 }}>
        <select className="in" value={gFilter} onChange={e => setGFilter(e.target.value)}>
          <option value="">All godowns</option>
          {(store.godowns || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: stockHtml(store, gFilter || null), suggestedName: `stock-report-${m0}.pdf` })}>Print stock report</button>
      </div>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Stock valuation — {fmt(stockVal, cur)}</h3>
      <table className="grid">
        <thead><tr><th>Code</th><th>Item</th><th className="r">Qty</th><th className="r">Value</th></tr></thead>
        <tbody>
          {rows.filter(r => r.qty > 0).map(r => <tr key={r.item.id}><td>{r.item.code}</td><td>{r.item.name}</td><td className="r">{r.qty.toLocaleString()}</td><td className="r">{r.value.toLocaleString()}</td></tr>)}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>6-month flow</h3>
      <table className="grid">
        <thead><tr><th>Month</th><th className="r">Goods in</th><th className="r">Goods out</th><th className="r">Received</th><th className="r">Paid</th><th className="r">Expenses</th></tr></thead>
        <tbody>
          {trend.map(t => (
            <tr key={t.m}>
              <td>{t.m}</td><td className="r">{t.inValue.toLocaleString()}</td><td className="r">{t.outValue.toLocaleString()}</td>
              <td className="r">{t.received.toLocaleString()}</td><td className="r">{t.paid.toLocaleString()}</td><td className="r">{t.expenses.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Top movers (qty)</h3>
      <table className="grid">
        <thead><tr><th>Item</th><th className="r">Qty moved</th></tr></thead>
        <tbody>
          {top.map(([id, q]) => { const it = (store.items || []).find(x => x.id === id); return <tr key={id}><td>{it?.name || id}</td><td className="r">{q.toLocaleString()}</td></tr>; })}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Party balances</h3>
      <table className="grid">
        <thead><tr><th>Party</th><th>Type</th><th className="r">Balance</th></tr></thead>
        <tbody>
          {owing.map(x => (
            <tr key={x.p.id}><td>{x.p.name}</td><td>{x.p.type}</td>
              <td className="r" style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(x.bal, cur)}</td></tr>
          ))}
          {!owing.length && <tr><td colSpan="3" className="muted">Sab clear.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
