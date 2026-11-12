import { DAY_LABELS } from '../../utils/pitchRange.js';

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const fmtHour = (h) => {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return `${hh}${ampm}`;
};

export function bucketsDeVista(viewMode, rangeStart, rangeEnd) {
  const list = [];
  if (!rangeStart || !rangeEnd) return list;
  if (viewMode === 'day') {
    for (let h = 0; h < 24; h += 2) {
      list.push({
        key: `h${h}`,
        label: fmtHour(h),
        test: (p) => p.hour >= h && p.hour < h + 2,
      });
    }
    return list;
  }
  if (viewMode === 'month') {
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);
    let cursor = new Date(start);
    let guard = 0;
    while (cursor <= end && guard < 200) {
      const bStart = new Date(cursor);
      const bEnd = addDays(cursor, 2);
      list.push({
        key: `d${bStart.getTime()}`,
        label: `${bStart.getDate()}`,
        test: (p) => p.dateLocal >= bStart && p.dateLocal < bEnd,
      });
      cursor = addDays(cursor, 2);
      guard += 1;
    }
    return list;
  }
  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);
  let cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 40) {
    const d0 = new Date(cursor);
    list.push({
      key: `d${d0.getTime()}`,
      label: `${DAY_LABELS[d0.getDay()]} ${d0.getDate()}`,
      test: (p) => p.dateLocal.getTime() === d0.getTime(),
    });
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return list;
}

export function leadsUnicosDeFilas(rows = []) {
  const map = new Map();
  for (const row of rows || []) {
    if (!row?.card_id || map.has(row.card_id)) continue;
    const nombre = String(row.nombre || '').trim();
    map.set(row.card_id, {
      card_id: row.card_id,
      nombre: nombre || row.card_id,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );
}
