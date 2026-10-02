// Godownory document model — offline warehouse/godown stock register:
// items × godowns stock grid, goods in/out challans (3-part print),
// godown-to-godown transfers, supplier/customer ledgers, stock valuation.
// Money & stock rows never deleted; numbers gap-free; voids keep rows.

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 10);
export const fmt = (n, cur = 'Rs') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const today = () => new Date().toISOString().slice(0, 10);
export const ym = iso => (iso || '').slice(0, 7);
export const addDays = (iso, k) => { const d = new Date(iso || today()); d.setDate(d.getDate() + k); return d.toISOString().slice(0, 10); };
export const addMonths = (m, k) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export const ROLES = {
  owner: 'Owner — full access',
  manager: 'Manager — challans & ledgers, no user management',
  keeper: 'Godown keeper — stock entries only',
  clerk: 'Clerk — items & parties only'
};

export function emptyStore() {
  return {
    version: 1,
    godowns: [],    // {id, name, address}
    items: [],      // {id, code, name, unit, price (sale), min, stock:{godown_id:qty}, avgCost:{godown_id:cost}}
    parties: [],    // {id, type:'supplier'|'customer', name, phone, whatsapp, address}
    challans: [],   // {id, no, type:'in'|'out'|'transfer', date, party_id, from_godown, to_godown, items:[{item_id,name,qty,rate}], amount, status:'posted'|'void', void_reason, by, note}
    receipts: [],   // {id, no, party_id, date, amount, direction:'in'|'out' (received from customer / paid to supplier), mode, ref, status, void_reason, by}
    expenses: [],   // {id, date, head, amount, note, by}
    auditLog: [],
    settings: defaultSettings(),
    counters: { challan: 0, receipt: 0, item: 0, party: 0 },
    updatedAt: Date.now()
  };
}

export function defaultSettings() {
  return {
    companyName: '', companyAddress: '', companyPhone: '',
    currency: 'Rs',
    receiptFooter: 'Maal challan dekh kar diya jayega — challan sambhal kar rakhein.',
    letterheadOffset: 0,
    users: [],
    backupFolder: '', lastBackupAt: '',
    syncFolder: '', syncAuto: true, syncCode: '', hostOn: false,
    uiUrdu: false, printUrdu: true,
    firstRunDone: false, consent: null
  };
}

// ---------- lookups ----------
export const godown = (s, id) => (s.godowns || []).find(g => g.id === id) || null;
export const item = (s, id) => (s.items || []).find(i => i.id === id) || null;
export const party = (s, id) => (s.parties || []).find(p => p.id === id) || null;
export const totalStock = it => Object.values(it.stock || {}).reduce((t, q) => t + num(q), 0);
export const totalValue = it => Object.entries(it.stock || {}).reduce((t, [g, q]) => t + num(q) * num((it.avgCost || {})[g]), 0);
export const lowStock = s => (s.items || []).filter(i => num(i.min) > 0 && totalStock(i) <= num(i.min));

// ---------- challans ----------
export function postChallan(store, { type, date, party_id, from_godown, to_godown, items, note }, by) {
  store.counters.challan = (store.counters.challan || 0) + 1;
  const ch = {
    id: uid('ch'), no: store.counters.challan, type,
    date: date || today(), party_id: party_id || null,
    from_godown: from_godown || null, to_godown: to_godown || null,
    items: (items || []).map(i => ({ item_id: i.item_id, name: i.name || item(store, i.item_id)?.name || '', qty: num(i.qty), rate: num(i.rate) })),
    amount: 0, status: 'posted', by: by || '', note: note || ''
  };
  ch.amount = ch.items.reduce((t, i) => t + i.qty * i.rate, 0);
  // stock movement
  for (const ln of ch.items) {
    const it = item(store, ln.item_id);
    if (!it) continue;
    it.stock = it.stock || {}; it.avgCost = it.avgCost || {};
    if (type === 'in') {
      const g = ch.to_godown;
      const oldQ = num(it.stock[g]), oldC = num(it.avgCost[g]);
      const newQ = oldQ + ln.qty;
      it.avgCost[g] = newQ > 0 ? (oldQ * oldC + ln.qty * ln.rate) / newQ : 0;
      it.stock[g] = newQ;
    } else if (type === 'out') {
      const g = ch.from_godown;
      it.stock[g] = num(it.stock[g]) - ln.qty;
    } else if (type === 'transfer') {
      const src = ch.from_godown, dst = ch.to_godown;
      it.stock[src] = num(it.stock[src]) - ln.qty;
      it.stock[dst] = num(it.stock[dst]) + ln.qty;
      if (it.avgCost[dst] === undefined && it.avgCost[src] !== undefined) it.avgCost[dst] = it.avgCost[src];
    }
  }
  store.challans.push(ch);
  return ch;
}

export function voidChallan(store, challanId, reason) {
  const ch = (store.challans || []).find(x => x.id === challanId);
  if (!ch || ch.status === 'void') return null;
  ch.status = 'void'; ch.void_reason = reason || ''; ch.voided_on = today();
  // reverse stock
  for (const ln of ch.items) {
    const it = item(store, ln.item_id);
    if (!it) continue;
    if (ch.type === 'in') it.stock[ch.to_godown] = num(it.stock[ch.to_godown]) - ln.qty;
    else if (ch.type === 'out') it.stock[ch.from_godown] = num(it.stock[ch.from_godown]) + ln.qty;
    else if (ch.type === 'transfer') {
      it.stock[ch.from_godown] = num(it.stock[ch.from_godown]) + ln.qty;
      it.stock[ch.to_godown] = num(it.stock[ch.to_godown]) - ln.qty;
    }
  }
  return ch;
}

// ---------- party ledger ----------
export function partyBalance(store, partyId) {
  // IN challans from supplier = we owe; paid 'out' reduces
  // OUT challans to customer = they owe; received 'in' reduces
  let bal = 0;
  const p = party(store, partyId);
  if (!p) return 0;
  for (const ch of store.challans || []) {
    if (ch.party_id !== partyId || ch.status === 'void') continue;
    if (p.type === 'supplier' && ch.type === 'in') bal += ch.amount;
    if (p.type === 'customer' && ch.type === 'out') bal += ch.amount;
  }
  for (const r of store.receipts || []) {
    if (r.party_id !== partyId || r.status === 'void') continue;
    bal -= num(r.amount);
  }
  return bal;
}

export function receivePayment(store, { party_id, amount, direction, mode, ref, date }, by) {
  store.counters.receipt = (store.counters.receipt || 0) + 1;
  const r = {
    id: uid('r'), no: store.counters.receipt, party_id,
    date: date || today(), amount: num(amount),
    direction: direction || 'in', // 'in' = cash received (from customer), 'out' = paid (to supplier)
    mode: mode || 'cash', ref: ref || '',
    status: 'received', by: by || ''
  };
  store.receipts.push(r);
  return r;
}

export function voidReceipt(store, receiptId, reason) {
  const r = (store.receipts || []).find(x => x.id === receiptId);
  if (!r || r.status === 'void') return null;
  r.status = 'void'; r.void_reason = reason || ''; r.voided_on = today();
  return r;
}

// ---------- reports ----------
export function monthSummary(store, month) {
  const challans = (store.challans || []).filter(c => ym(c.date) === month && c.status !== 'void');
  const receipts = (store.receipts || []).filter(r => ym(r.date) === month && r.status !== 'void');
  const expenses = (store.expenses || []).filter(e => ym(e.date) === month);
  return {
    inValue: challans.filter(c => c.type === 'in').reduce((t, c) => t + c.amount, 0),
    outValue: challans.filter(c => c.type === 'out').reduce((t, c) => t + c.amount, 0),
    received: receipts.filter(r => r.direction === 'in').reduce((t, r) => t + num(r.amount), 0),
    paid: receipts.filter(r => r.direction === 'out').reduce((t, r) => t + num(r.amount), 0),
    expenses: expenses.reduce((t, e) => t + num(e.amount), 0)
  };
}

export function stockReport(store, godownId) {
  return (store.items || []).map(it => ({
    item: it,
    qty: godownId ? num((it.stock || {})[godownId]) : totalStock(it),
    value: godownId ? num((it.stock || {})[godownId]) * num((it.avgCost || {})[godownId]) : totalValue(it)
  }));
}

export function waLink(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? '92' + d.slice(1) : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

// ---------- sample data ----------
export function sampleStore() {
  const s = emptyStore();
  s.settings.companyName = 'Al-Madina Trading Godown';
  s.settings.companyAddress = 'GT Road, Gujranwala';
  s.settings.companyPhone = '055-5550300';
  s.godowns = [
    { id: 'g1', name: 'Main Godown', address: 'GT Road' },
    { id: 'g2', name: 'City Shop Store', address: 'Rail Bazar' }
  ];
  const it = (id, code, name, unit, price, min, stock, avgCost) => ({ id, code, name, unit, price, min, stock, avgCost });
  s.items = [
    it('i1', 'A-001', 'Cement bag (50kg)', 'bag', 1450, 20, { g1: 180, g2: 30 }, { g1: 1300, g2: 1300 }),
    it('i2', 'A-002', 'Sarya 10mm (bundle)', 'bundle', 62000, 3, { g1: 12 }, { g1: 59000 }),
    it('i3', 'A-003', 'Bricks (thousand)', 'hazar', 24000, 5, { g1: 40, g2: 10 }, { g1: 22000, g2: 22000 }),
    it('i4', 'A-004', 'Paint bucket (16L)', 'bucket', 9800, 8, { g1: 6, g2: 12 }, { g1: 8500, g2: 8500 })
  ];
  s.counters.item = 4;
  s.parties = [
    { id: 'p1', type: 'supplier', name: 'Fauji Cement Depot', phone: '0300-1112233', whatsapp: '0300-1112233', address: '' },
    { id: 'p2', type: 'supplier', name: 'Steel House Lahore', phone: '0321-5556677', whatsapp: '', address: '' },
    { id: 'p3', type: 'customer', name: 'Haji Constructions', phone: '0333-8889900', whatsapp: '0333-8889900', address: '' },
    { id: 'p4', type: 'customer', name: 'City Builders', phone: '0345-7778889', whatsapp: '', address: '' }
  ];
  let n = 0;
  const mkCh = (type, date, party_id, from, to, items, adv) => {
    const ch = { id: uid('ch'), no: ++n, type, date, party_id, from_godown: from, to_godown: to, items, amount: items.reduce((t, i) => t + i.qty * i.rate, 0), status: 'posted', by: 'owner', note: '' };
    s.challans.push(ch);
    if (adv > 0) { s.counters.receipt++; s.receipts.push({ id: uid('r'), no: s.counters.receipt, party_id, date, amount: adv, direction: party_id?.startsWith('p') && (party(s, party_id) || {}).type === 'supplier' ? 'out' : 'in', mode: 'cash', ref: '', status: 'received', by: 'owner' }); }
    return ch;
  };
  mkCh('in', addDays(today(), -10), 'p1', null, 'g1', [{ item_id: 'i1', name: 'Cement bag (50kg)', qty: 50, rate: 1300 }], 30000);
  mkCh('out', addDays(today(), -6), 'p3', 'g1', null, [{ item_id: 'i1', name: 'Cement bag (50kg)', qty: 30, rate: 1450 }, { item_id: 'i2', name: 'Sarya 10mm (bundle)', qty: 2, rate: 62000 }], 50000);
  mkCh('transfer', addDays(today(), -3), null, 'g1', 'g2', [{ item_id: 'i3', name: 'Bricks (thousand)', qty: 10, rate: 22000 }], 0);
  mkCh('out', today(), 'p4', 'g2', null, [{ item_id: 'i4', name: 'Paint bucket (16L)', qty: 4, rate: 9800 }], 0);
  s.counters.challan = n;
  s.expenses = [{ id: uid('e'), date: addDays(today(), -4), head: 'Loader/mazdoori', amount: 3500, note: '', by: 'owner' }];
  s.settings.firstRunDone = false;
  return s;
}
