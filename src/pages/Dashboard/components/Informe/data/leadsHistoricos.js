// Datos históricos de leads creados por año/mes (mes calendario tradicional).
// Para 2026 desde marzo en adelante usamos config_meses (rangos particulares)
// y se consultan en runtime contra Supabase.

export const LEADS_HISTORICOS = {
  2024: {
    '01': 490, '02': 907, '03': 736, '04': 734,
    '05': 875, '06': 756, '07': 957, '08': 990,
    '09': 672, '10': 783, '11': 846, '12': 660,
  },
  2025: {
    '01': 1421, '02': 1128, '03': 805, '04': 2768,
    '05': 1700, '06': 1112, '07': 1372, '08': 1233,
    '09': 1146, '10': 1573, '11': 1125, '12': 1583,
  },
  2026: {
    '01': 2336, '02': 1135,
  },
};

export const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
