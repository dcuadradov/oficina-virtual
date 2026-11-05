export const OPCIONES_LLAMADA = ['LNC.', 'LC.', 'LA.'];
export const OPCIONES_MENSAJE = ['MC.', 'MNC.', 'MA.'];
export const SIGLA_LLAMADA_DEFAULT = 'LNC.';
export const SIGLA_MENSAJE_DEFAULT = 'MNC.';

export function tieneSiglaCanal(llamada, mensaje) {
  return Boolean(llamada || mensaje);
}

export function camposCanal(llamada, mensaje) {
  return {
    llamada: llamada || null,
    mensaje: mensaje || null,
  };
}

export function prefijoDetalleCanal(llamada, mensaje) {
  const partes = [mensaje, llamada].filter(Boolean);
  if (partes.length === 0) return '';
  return `(${partes.join(' - ')}) `;
}
