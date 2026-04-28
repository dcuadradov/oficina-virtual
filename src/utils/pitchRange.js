// Utilidades compartidas para resolver el rango de fechas de Mis Pitch
// (calendario y KPIs) a partir de los dropdowns mes/periodo/día.

const parseLocalDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// Devuelve el martes ≤ fecha dada (anclaje de periodos martes-a-lunes).
const getTuesdayWeekStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Tuesday=2 en JS (Sun=0)
  const offset = (d.getDay() - 2 + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
};

/**
 * Resuelve el rango activo a partir de los dropdowns del Dashboard.
 * Prioridad: día > periodo > mes > (default: periodo actual martes-a-lunes).
 * Retorna { viewMode, rangeStart, rangeEnd } con Date locales (00:00).
 */
export function resolvePitchRange({
  selectedDia = null,
  selectedPeriodo = null,
  selectedMes = null,
  monthConfigs = {},
} = {}) {
  if (selectedDia) {
    const start = parseLocalDate(selectedDia);
    return { viewMode: 'day', rangeStart: start, rangeEnd: start };
  }
  if (selectedPeriodo) {
    const [ini, fin] = selectedPeriodo.split('_');
    return {
      viewMode: 'period',
      rangeStart: parseLocalDate(ini),
      rangeEnd: parseLocalDate(fin),
    };
  }
  if (selectedMes) {
    const cfg = monthConfigs?.[selectedMes];
    const [yStr, mStr] = selectedMes.split('-');
    const año = parseInt(yStr, 10);
    const mes = parseInt(mStr, 10);
    let start, end;
    if (cfg?.fecha_inicio) {
      start = parseLocalDate(cfg.fecha_inicio);
      end = cfg.fecha_fin ? parseLocalDate(cfg.fecha_fin) : new Date();
    } else {
      start = new Date(año, mes - 1, 1);
      end = new Date(año, mes, 0);
    }
    return { viewMode: 'month', rangeStart: start, rangeEnd: end };
  }
  // Default: periodo actual (martes-a-lunes que contiene hoy)
  const start = getTuesdayWeekStart(new Date());
  const end = addDays(start, 6);
  return { viewMode: 'period', rangeStart: start, rangeEnd: end };
}

export const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
