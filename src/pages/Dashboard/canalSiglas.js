export const OPCIONES_LLAMADA = ['LNC.', 'LC.', 'LA.'];
export const OPCIONES_MENSAJE = ['MC.', 'MNC.', 'MA.'];

export function tieneSiglaCanal(llamada, mensaje) {
  return Boolean(llamada || mensaje);
}

export function camposCanal(llamada, mensaje) {
  return {
    llamada: llamada || null,
    mensaje: mensaje || null,
  };
}
