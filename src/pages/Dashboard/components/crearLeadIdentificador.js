/**
 * Identificador de creación de lead: teléfono o usuario de WhatsApp.
 * El webhook recibe dos llaves extra; el resto del payload no cambia.
 */

export function normalizarUsuarioWhatsapp(raw) {
  if (raw == null) return '';
  return String(raw).trim().replace(/^@+/, '');
}

export function validarUsuarioWhatsapp(raw) {
  const valor = normalizarUsuarioWhatsapp(raw);
  if (!valor) {
    return { valido: false, mensaje: 'Ingresa el usuario de WhatsApp', valor: '' };
  }
  if (/\s/.test(valor)) {
    return { valido: false, mensaje: 'El usuario no puede tener espacios', valor };
  }
  if (valor.length < 3 || valor.length > 30) {
    return { valido: false, mensaje: 'El usuario debe tener entre 3 y 30 caracteres', valor };
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9._]*[A-Za-z0-9])?$/.test(valor)) {
    return {
      valido: false,
      mensaje: 'Solo letras, números, punto y guion bajo. Sin @.',
      valor,
    };
  }
  if (/^\d+$/.test(valor)) {
    return { valido: false, mensaje: 'Eso parece un teléfono. Usa la opción Teléfono.', valor };
  }
  return { valido: true, mensaje: '', valor };
}

/**
 * Agrega las dos llaves al payload de creación individual.
 * No toca data, tipo, ni el resto de claves.
 */
export function conIdentificadorWhatsapp(payload, tieneUsuarioWhatsapp, usuarioWhatsapp) {
  const tiene = Boolean(tieneUsuarioWhatsapp);
  return {
    ...payload,
    tiene_usuario_whatsapp: tiene,
    usuario_whatsapp: tiene ? normalizarUsuarioWhatsapp(usuarioWhatsapp) : '',
  };
}
