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

// Datos históricos de matrículas (leads que llegaron a etapa "Matrícula").
// Para 2026 desde marzo en adelante se consultan en runtime contra Supabase
// usando updated_at + etapa_funnel = 'Matrícula' (mismo criterio del KPI "Reales" en Mis Pitch).
export const MATRICULAS_HISTORICAS = {
  2024: {
    '01': 31, '02': 32, '03': 36, '04': 27,
    '05': 20, '06': 36, '07': 11, '08': 24,
    '09': 58, '10': 43, '11': 57, '12': 47,
  },
  2025: {
    '01': 67, '02': 55, '03': 38, '04': 61,
    '05': 56, '06': 50, '07': 45, '08': 56,
    '09': 36, '10': 59, '11': 39, '12': 47,
  },
  2026: {
    '01': 66, '02': 40,
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
