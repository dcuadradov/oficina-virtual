import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  conIdentificadorWhatsapp,
  normalizarUsuarioWhatsapp,
  validarUsuarioWhatsapp,
} from './crearLeadIdentificador.js';

test('normaliza quitando @ y espacios', () => {
  assert.equal(normalizarUsuarioWhatsapp('  @pepito  '), 'pepito');
  assert.equal(normalizarUsuarioWhatsapp('@@ana.garcia'), 'ana.garcia');
  assert.equal(normalizarUsuarioWhatsapp(''), '');
});

test('rechaza usuario vacío, con espacios, solo dígitos o punto al borde', () => {
  assert.equal(validarUsuarioWhatsapp('').valido, false);
  assert.equal(validarUsuarioWhatsapp('ana maria').valido, false);
  assert.equal(validarUsuarioWhatsapp('3001234567').valido, false);
  assert.equal(validarUsuarioWhatsapp('.pepito').valido, false);
  assert.equal(validarUsuarioWhatsapp('pepito.').valido, false);
});

test('acepta un usuario de WhatsApp válido', () => {
  const ok = validarUsuarioWhatsapp('@Ana.garcia_1');
  assert.equal(ok.valido, true);
  assert.equal(ok.valor, 'Ana.garcia_1');
});

test('el payload original se conserva y solo se agregan las dos llaves', () => {
  const base = {
    usuario_email: 'c@mdenglish.us',
    tipo_formulario: 'Orgánico',
    tipo: 'Individual',
    data: { Teléfono: '+57.3001234567', Nombre: 'Ana' },
  };

  const conTelefono = conIdentificadorWhatsapp(base, false, 'pepito');
  assert.equal(conTelefono.usuario_email, base.usuario_email);
  assert.equal(conTelefono.tipo_formulario, 'Orgánico');
  assert.equal(conTelefono.tipo, 'Individual');
  assert.deepEqual(conTelefono.data, base.data);
  assert.equal(conTelefono.tiene_usuario_whatsapp, false);
  assert.equal(conTelefono.usuario_whatsapp, '');
  assert.equal(typeof conTelefono.tiene_usuario_whatsapp, 'boolean');
  assert.equal(JSON.parse(JSON.stringify(conTelefono)).tiene_usuario_whatsapp, false);

  const conUsuario = conIdentificadorWhatsapp(base, true, ' @pepito ');
  assert.deepEqual(conUsuario.data, base.data);
  assert.equal(conUsuario.tiene_usuario_whatsapp, true);
  assert.equal(conUsuario.usuario_whatsapp, 'pepito');
  assert.equal(JSON.parse(JSON.stringify(conUsuario)).tiene_usuario_whatsapp, true);
});
