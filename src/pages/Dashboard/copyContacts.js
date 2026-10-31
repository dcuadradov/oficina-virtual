/**
 * Contactos para copiar desde Gestión.
 * El teléfono en leads a veces llega como +57.3173588591; al portapapeles
 * sale internacional, todo pegado: +573173588591.
 * Los correos van separados por coma, listos para el campo Para de Gmail.
 */

export const CONTACT_PAGE_SIZE = 1000;
export const MAX_CONTACT_ROWS = 15000;

export function nextContactPage(from, pageLength, pageSize = CONTACT_PAGE_SIZE, maxRows = MAX_CONTACT_ROWS) {
  const loaded = from + pageLength;
  if (!pageLength || pageLength < pageSize) {
    return { done: true, truncated: false, nextFrom: from };
  }
  if (loaded >= maxRows) {
    return { done: true, truncated: true, nextFrom: from };
  }
  return { done: false, truncated: false, nextFrom: from + pageSize };
}

export function formatPhone(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return null;
  return `+${digits}`;
}

export function formatEmail(raw) {
  const value = String(raw || '').trim();
  if (!value || !value.includes('@')) return null;
  return value;
}

export function collectContacts(pages) {
  const phones = [];
  const emails = [];
  const seenPhones = new Set();
  const seenEmails = new Set();

  for (const page of pages) {
    for (const row of page || []) {
      const phone = formatPhone(row?.telefono);
      if (phone && !seenPhones.has(phone)) {
        seenPhones.add(phone);
        phones.push(phone);
      }
      const email = formatEmail(row?.email);
      if (email) {
        const key = email.toLowerCase();
        if (!seenEmails.has(key)) {
          seenEmails.add(key);
          emails.push(email);
        }
      }
    }
  }

  return { phones, emails };
}

export function joinForClipboard(values) {
  return (values || []).join(', ');
}
