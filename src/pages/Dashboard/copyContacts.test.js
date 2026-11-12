import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectContacts, formatEmail, formatPhone, joinForClipboard, nextContactPage, whatsappWebUrl } from './copyContacts.js';

test('formatPhone deja el internacional todo pegado', () => {
  assert.equal(formatPhone('+57.3173588591'), '+573173588591');
  assert.equal(formatPhone('+57 317 358 8591'), '+573173588591');
  assert.equal(formatPhone('00573173588591'), '+573173588591');
  assert.equal(formatPhone(''), null);
  assert.equal(formatPhone('   '), null);
});

test('whatsappWebUrl arma el enlace de WhatsApp Web', () => {
  assert.equal(whatsappWebUrl('+57.3173588591'), 'https://wa.me/573173588591');
  assert.equal(whatsappWebUrl('+57 317 358 8591'), 'https://wa.me/573173588591');
  assert.equal(whatsappWebUrl('+573176675788'), 'https://wa.me/573176675788');
  assert.equal(whatsappWebUrl(''), null);
});

test('formatEmail recorta y descarta lo que no es correo', () => {
  assert.equal(formatEmail('  ana@mdenglish.us '), 'ana@mdenglish.us');
  assert.equal(formatEmail('sin-arroba'), null);
  assert.equal(formatEmail(''), null);
});

test('formatEmail no trata notiene@mail.com como correo', () => {
  assert.equal(formatEmail('notiene@mail.com'), null);
  assert.equal(formatEmail('  NoTiene@Mail.com  '), null);
});

test('collectContacts no repite y cuenta teléfono y correo por separado', () => {
  const pages = [
    [
      { telefono: '+57.3001112233', email: 'uno@mdenglish.us' },
      { telefono: '+573001112233', email: 'UNO@mdenglish.us' },
      { telefono: '', email: 'solo@mdenglish.us' },
      { telefono: '+52.5512345678', email: null },
      { telefono: '+573009990000', email: 'notiene@mail.com' },
    ],
  ];
  assert.deepEqual(collectContacts(pages), {
    phones: ['+573001112233', '+525512345678', '+573009990000'],
    emails: ['uno@mdenglish.us', 'solo@mdenglish.us'],
  });
});

test('nextContactPage pagina de a mil y corta a los 15.000', () => {
  assert.deepEqual(nextContactPage(0, 1000), { done: false, truncated: false, nextFrom: 1000 });
  assert.deepEqual(nextContactPage(1000, 100), { done: true, truncated: false, nextFrom: 1000 });
  assert.deepEqual(nextContactPage(14000, 1000), { done: true, truncated: true, nextFrom: 14000 });
});

test('joinForClipboard arma la lista para pegar en Gmail', () => {
  assert.equal(
    joinForClipboard(['a@mdenglish.us', 'b@mdenglish.us']),
    'a@mdenglish.us, b@mdenglish.us',
  );
  assert.equal(
    joinForClipboard(['+573173588591', '+525512345678']),
    '+573173588591, +525512345678',
  );
});
