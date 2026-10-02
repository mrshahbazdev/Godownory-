// Print HTML: 3-part challan (A4 thirds), receipt (A5), stock report (A4),
// party statement (A4), movement report (A4).
import { fmt, num, godown, party, item, totalStock, totalValue, stockReport, partyBalance } from './model.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const baseCss = extra => `
  body{font:10pt 'Segoe UI',sans-serif;color:#111}
  .co-name{font-size:12pt;font-weight:700;text-align:center}
  .co-sub{text-align:center;font-size:8pt;color:#444;margin-bottom:2mm}
  table{width:100%;border-collapse:collapse} td,th{padding:1.6mm;border-bottom:1px solid #e2e8f0}
  th{text-align:left;font-size:8pt;color:#555}
  .r{text-align:right}.big{font-size:12pt;font-weight:700}
  .sign{display:flex;justify-content:space-between;margin:8mm 2mm 0;font-size:7.5pt;color:#444}
  .sign span{border-top:1px solid #555;padding-top:1mm;min-width:22mm;text-align:center}
  .foot{text-align:center;font-size:7.5pt;color:#666}
  ${extra || ''}`;
const head = (store, label) => {
  const s = store.settings;
  return `<div class="co-name">${esc(s.companyName || 'Warehouse')}</div>
    <div class="co-sub" style="padding-top:${num(s.letterheadOffset)}mm">${esc(s.companyAddress || '')} ${s.companyPhone ? ' · ' + esc(s.companyPhone) : ''}</div>
    <div style="text-align:center;font-weight:600;margin-bottom:3mm">${esc(label)}</div>`;
};
const foot = store => `<div class="foot">${esc(store.settings.receiptFooter || '')}</div>`;
const doc = (title, css, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss(css)}</style></head><body>${body}</body></html>`;

const TYPE_LABEL = { in: 'GOODS IN', out: 'GOODS OUT', transfer: 'TRANSFER' };

function partHtml(store, ch, partName) {
  const p = ch.party_id ? party(store, ch.party_id) : null;
  const from = ch.from_godown ? godown(store, ch.from_godown) : null;
  const to = ch.to_godown ? godown(store, ch.to_godown) : null;
  return `
    <div style="border:1px dashed #94a3b8;padding:4mm;margin-bottom:4mm">
      <div style="display:flex;justify-content:space-between;font-size:8pt;color:#555"><b>${TYPE_LABEL[ch.type]} CHALLAN #${ch.no}</b><span>${esc(partName)}</span></div>
      <div class="co-name" style="font-size:10pt">${esc(store.settings.companyName || 'Warehouse')}</div>
      <div class="co-sub" style="margin-bottom:1mm">${esc(store.settings.companyAddress || '')} ${store.settings.companyPhone ? ' · ' + esc(store.settings.companyPhone) : ''}</div>
      <table style="font-size:8.5pt">
        <tr><td>Date: <b>${esc(ch.date)}</b></td>
          <td>${p ? 'Party: <b>' + esc(p.name) + '</b>' : ''}</td>
          <td class="r">${from ? 'From: <b>' + esc(from.name) + '</b> ' : ''}${to ? 'To: <b>' + esc(to.name) + '</b>' : ''}</td></tr>
      </table>
      <table style="font-size:8.5pt;margin-top:1mm"><tr><th>Item</th><th style="text-align:center">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
        ${ch.items.map(i => `<tr><td>${esc(i.name)}</td><td style="text-align:center">${i.qty}</td><td class="r">${num(i.rate).toLocaleString()}</td><td class="r">${(i.qty * i.rate).toLocaleString()}</td></tr>`).join('')}
        <tr><td colspan="3"><b>Total</b></td><td class="r"><b>${fmt(ch.amount, store.settings.currency)}</b></td></tr>
      </table>
      ${ch.status === 'void' ? '<div style="color:#dc2626;font-weight:700">VOID — ' + esc(ch.void_reason || '') + '</div>' : ''}
      ${ch.note ? `<div style="font-size:8pt">Note: ${esc(ch.note)}</div>` : ''}
      <div class="sign"><span>Prepared by</span><span>Driver/Carrier</span><span>Receiver</span></div>
    </div>`;
}

export function challanHtml(store, ch) {
  return doc(`Challan #${ch.no}`, '', `${partHtml(store, ch, 'Office copy')}
    ${partHtml(store, ch, 'Party copy')}
    ${partHtml(store, ch, 'Gate copy')}`);
}

export function receiptHtml(store, r) {
  const p = party(store, r.party_id) || {};
  return doc(`Receipt #${r.no}`, '.nb td{border:none}', `${head(store, r.direction === 'out' ? 'Payment Voucher' : 'Receipt')}
    <table>
      <tr><td><b>${r.direction === 'out' ? 'Voucher' : 'Receipt'} #${r.no}</b>${r.status === 'void' ? ' — VOID' : ''}</td><td class="r">Date: ${esc(r.date)}</td></tr>
      <tr><td colspan="2">${r.direction === 'out' ? 'Paid to' : 'Received from'}: <b>${esc(p.name)}</b> ${p.type ? '(' + esc(p.type) + ')' : ''}</td></tr>
      <tr><td>Mode: ${esc(r.mode)}${r.ref ? ' · ' + esc(r.ref) : ''}</td><td class="r big">${fmt(r.amount, store.settings.currency)}</td></tr>
    </table>
    <div class="sign"><span>${r.direction === 'out' ? 'Paid by: ' : 'Received by: '}${esc(r.by || '')}</span><span>Signature</span></div>
    ${foot(store)}`);
}

export function stockHtml(store, godownId) {
  const g = godownId ? godown(store, godownId) : null;
  const rows = stockReport(store, godownId);
  const tot = rows.reduce((t, r) => t + r.value, 0);
  return doc('Stock report', '', `${head(store, 'Stock Report' + (g ? ' — ' + g.name : ' — all godowns'))}
    <table><tr><th>Code</th><th>Item</th><th>Unit</th><th class="r">Qty</th><th class="r">Value</th></tr>
    ${rows.map(r => `<tr${r.qty <= 0 ? ' style="color:#94a3b8"' : ''}><td>${esc(r.item.code)}</td><td>${esc(r.item.name)}</td><td>${esc(r.item.unit)}</td><td class="r">${r.qty.toLocaleString()}</td><td class="r">${r.value.toLocaleString()}</td></tr>`).join('')}
    <tr><td colspan="4"><b>Total valuation</b></td><td class="r"><b>${fmt(tot, store.settings.currency)}</b></td></tr>
    </table>${foot(store)}`);
}

export function partyStatementHtml(store, p) {
  const challans = (store.challans || []).filter(c => c.party_id === p.id);
  const receipts = (store.receipts || []).filter(r => r.party_id === p.id);
  const rows = [
    ...challans.map(c => ({ date: c.date, desc: `${TYPE_LABEL[c.type]} challan #${c.no}`, dr: c.amount, cr: 0, void: c.status === 'void' })),
    ...receipts.map(r => ({ date: r.date, desc: `${r.direction === 'out' ? 'Paid' : 'Received'} #${r.no} (${r.mode})`, dr: 0, cr: r.amount, void: r.status === 'void' }))
  ].sort((a, b) => a.date.localeCompare(b.date));
  return doc(`Statement — ${p.name}`, '', `${head(store, (p.type === 'supplier' ? 'Supplier' : 'Customer') + ' Ledger')}
    <table><tr><td><b>${esc(p.name)}</b></td><td class="r">${esc(p.phone || '')}</td></tr></table>
    <table style="margin-top:3mm"><tr><th>Date</th><th>Entry</th><th class="r">Debit</th><th class="r">Credit</th></tr>
    ${rows.map(x => `<tr${x.void ? ' style="color:#94a3b8"' : ''}><td>${x.date}</td><td>${esc(x.desc)}${x.void ? ' (void)' : ''}</td><td class="r">${x.void ? '—' : x.dr.toLocaleString()}</td><td class="r">${x.void ? '—' : x.cr.toLocaleString()}</td></tr>`).join('')}
    <tr><td colspan="2"><b>Balance ${p.type === 'supplier' ? '(we owe)' : '(they owe)'}</b></td><td class="r" colspan="2"><b>${fmt(partyBalance(store, p.id), store.settings.currency)}</b></td></tr>
    </table>${foot(store)}`);
}

export function movementHtml(store, itemId) {
  const it = item(store, itemId);
  const rows = [];
  for (const ch of store.challans || []) {
    for (const ln of ch.items) {
      if (ln.item_id !== itemId || ch.status === 'void') continue;
      rows.push({ date: ch.date, type: ch.type, no: ch.no, g: ch.type === 'out' || ch.type === 'transfer' ? ch.from_godown : ch.to_godown, g2: ch.type === 'transfer' ? ch.to_godown : null, qty: ln.qty, rate: ln.rate });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return doc(`Movement — ${it?.name}`, '', `${head(store, 'Item Movement — ' + (it?.name || ''))}
    <table><tr><th>Date</th><th>Challan</th><th>Type</th><th>Godown</th><th class="r">Qty</th><th class="r">Rate</th></tr>
    ${rows.map(r => `<tr><td>${r.date}</td><td>#${r.no}</td><td>${r.type}</td><td>${esc(godown(store, r.g)?.name || '')}${r.g2 ? ' → ' + esc(godown(store, r.g2)?.name || '') : ''}</td><td class="r">${r.qty}</td><td class="r">${r.rate.toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="6">No movements.</td></tr>'}
    </table>${foot(store)}`);
}
