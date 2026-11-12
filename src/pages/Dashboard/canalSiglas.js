export const OPCIONES_LLAMADA = ['LNC.', 'LC.', 'LA.', 'LNE.'];
export const OPCIONES_MENSAJE = ['MC.', 'MNC.', 'MA.', 'MNE.'];
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

export function textoDetalleConCanal(texto, llamada, mensaje) {
  return `${prefijoDetalleCanal(llamada, mensaje)}${texto ?? ''}`;
}

export function origenEsRecordatorio(origen) {
  return /recordatorio/i.test(String(origen || ''));
}

const VENTANA_MISMO_EVENTO_MS = 60_000;
const VENTANA_SOLO_TIEMPO_MS = 15_000;

function distanciaEnMs(comentario, recordatorio) {
  const t = new Date(comentario?.created_at).getTime();
  const rt = new Date(recordatorio?.created_at).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(rt)) return Number.POSITIVE_INFINITY;
  return Math.abs(rt - t);
}

function elegirRecordatorioMasCercano(comentario, candidatos) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return null;
  const conCanal = candidatos.filter((r) => tieneSiglaCanal(r.llamada, r.mensaje));
  const pool = conCanal.length > 0 ? conCanal : candidatos;
  if (pool.length === 1) return pool[0];
  return pool.reduce((best, r) => (
    distanciaEnMs(comentario, r) < distanciaEnMs(comentario, best) ? r : best
  ));
}

export function encontrarRecordatorioDeComentario(comentario, recordatorios) {
  if (!comentario || !Array.isArray(recordatorios) || recordatorios.length === 0) {
    return null;
  }

  const texto = String(comentario.texto || '').trim();
  const esRec = origenEsRecordatorio(comentario.origen);
  const porTexto = texto
    ? recordatorios.filter((r) => String(r.observacion || '').trim() === texto)
    : [];

  if (!esRec) {
    const cercanos = porTexto.filter((r) => distanciaEnMs(comentario, r) <= VENTANA_MISMO_EVENTO_MS);
    return elegirRecordatorioMasCercano(comentario, cercanos);
  }

  if (porTexto.length > 0) {
    const cercanos = porTexto.filter((r) => distanciaEnMs(comentario, r) <= VENTANA_MISMO_EVENTO_MS);
    return elegirRecordatorioMasCercano(comentario, cercanos.length > 0 ? cercanos : porTexto);
  }

  const porTiempo = recordatorios.filter((r) => distanciaEnMs(comentario, r) <= VENTANA_SOLO_TIEMPO_MS);
  return elegirRecordatorioMasCercano(comentario, porTiempo);
}

export function enriquecerComentarioConCanal(comentario, recordatorios) {
  if (!comentario) return comentario;
  if (tieneSiglaCanal(comentario.llamada, comentario.mensaje)) return comentario;
  const rec = encontrarRecordatorioDeComentario(comentario, recordatorios);
  if (!rec || !tieneSiglaCanal(rec.llamada, rec.mensaje)) return comentario;
  return {
    ...comentario,
    llamada: rec.llamada || comentario.llamada || null,
    mensaje: rec.mensaje || comentario.mensaje || null,
  };
}
