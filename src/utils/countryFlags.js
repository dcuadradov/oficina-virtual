/**
 * Utilidad para convertir nombres de países a emojis de banderas
 * Escalable: funciona con cualquier país del mundo
 */

// Mapeo completo de nombres de países a códigos ISO 3166-1 alpha-2
// Incluye variaciones en español, inglés, con/sin tildes
const countryToISO = {
  // América del Sur
  'argentina': 'AR',
  'bolivia': 'BO',
  'brasil': 'BR',
  'brazil': 'BR',
  'chile': 'CL',
  'colombia': 'CO',
  'ecuador': 'EC',
  'guyana': 'GY',
  'paraguay': 'PY',
  'perú': 'PE',
  'peru': 'PE',
  'surinam': 'SR',
  'suriname': 'SR',
  'uruguay': 'UY',
  'venezuela': 'VE',
  
  // América Central y Caribe
  'belice': 'BZ',
  'belize': 'BZ',
  'costa rica': 'CR',
  'cuba': 'CU',
  'dominica': 'DM',
  'el salvador': 'SV',
  'guatemala': 'GT',
  'haití': 'HT',
  'haiti': 'HT',
  'honduras': 'HN',
  'jamaica': 'JM',
  'nicaragua': 'NI',
  'panamá': 'PA',
  'panama': 'PA',
  'puerto rico': 'PR',
  'república dominicana': 'DO',
  'republica dominicana': 'DO',
  'dominican republic': 'DO',
  'trinidad y tobago': 'TT',
  'trinidad and tobago': 'TT',
  
  // América del Norte
  'canadá': 'CA',
  'canada': 'CA',
  'estados unidos': 'US',
  'united states': 'US',
  'usa': 'US',
  'ee.uu.': 'US',
  'eeuu': 'US',
  'méxico': 'MX',
  'mexico': 'MX',
  
  // Europa
  'alemania': 'DE',
  'germany': 'DE',
  'austria': 'AT',
  'bélgica': 'BE',
  'belgica': 'BE',
  'belgium': 'BE',
  'bulgaria': 'BG',
  'croacia': 'HR',
  'croatia': 'HR',
  'dinamarca': 'DK',
  'denmark': 'DK',
  'eslovaquia': 'SK',
  'slovakia': 'SK',
  'eslovenia': 'SI',
  'slovenia': 'SI',
  'españa': 'ES',
  'espana': 'ES',
  'spain': 'ES',
  'estonia': 'EE',
  'finlandia': 'FI',
  'finland': 'FI',
  'francia': 'FR',
  'france': 'FR',
  'grecia': 'GR',
  'greece': 'GR',
  'hungría': 'HU',
  'hungria': 'HU',
  'hungary': 'HU',
  'irlanda': 'IE',
  'ireland': 'IE',
  'islandia': 'IS',
  'iceland': 'IS',
  'italia': 'IT',
  'italy': 'IT',
  'letonia': 'LV',
  'latvia': 'LV',
  'lituania': 'LT',
  'lithuania': 'LT',
  'luxemburgo': 'LU',
  'luxembourg': 'LU',
  'malta': 'MT',
  'noruega': 'NO',
  'norway': 'NO',
  'países bajos': 'NL',
  'paises bajos': 'NL',
  'netherlands': 'NL',
  'holanda': 'NL',
  'holland': 'NL',
  'polonia': 'PL',
  'poland': 'PL',
  'portugal': 'PT',
  'reino unido': 'GB',
  'united kingdom': 'GB',
  'uk': 'GB',
  'gran bretaña': 'GB',
  'great britain': 'GB',
  'inglaterra': 'GB',
  'england': 'GB',
  'república checa': 'CZ',
  'republica checa': 'CZ',
  'czech republic': 'CZ',
  'chequia': 'CZ',
  'rumania': 'RO',
  'rumanía': 'RO',
  'romania': 'RO',
  'rusia': 'RU',
  'russia': 'RU',
  'suecia': 'SE',
  'sweden': 'SE',
  'suiza': 'CH',
  'switzerland': 'CH',
  'ucrania': 'UA',
  'ukraine': 'UA',
  
  // Asia
  'afganistán': 'AF',
  'afganistan': 'AF',
  'afghanistan': 'AF',
  'arabia saudita': 'SA',
  'saudi arabia': 'SA',
  'bangladesh': 'BD',
  'camboya': 'KH',
  'cambodia': 'KH',
  'china': 'CN',
  'corea del norte': 'KP',
  'north korea': 'KP',
  'corea del sur': 'KR',
  'south korea': 'KR',
  'corea': 'KR',
  'korea': 'KR',
  'emiratos árabes unidos': 'AE',
  'emiratos arabes unidos': 'AE',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'filipinas': 'PH',
  'philippines': 'PH',
  'india': 'IN',
  'indonesia': 'ID',
  'irak': 'IQ',
  'iraq': 'IQ',
  'irán': 'IR',
  'iran': 'IR',
  'israel': 'IL',
  'japón': 'JP',
  'japon': 'JP',
  'japan': 'JP',
  'jordania': 'JO',
  'jordan': 'JO',
  'kazajistán': 'KZ',
  'kazajistan': 'KZ',
  'kazakhstan': 'KZ',
  'líbano': 'LB',
  'libano': 'LB',
  'lebanon': 'LB',
  'malasia': 'MY',
  'malaysia': 'MY',
  'nepal': 'NP',
  'pakistán': 'PK',
  'pakistan': 'PK',
  'palestina': 'PS',
  'palestine': 'PS',
  'singapur': 'SG',
  'singapore': 'SG',
  'siria': 'SY',
  'syria': 'SY',
  'tailandia': 'TH',
  'thailand': 'TH',
  'taiwán': 'TW',
  'taiwan': 'TW',
  'turquía': 'TR',
  'turquia': 'TR',
  'turkey': 'TR',
  'vietnam': 'VN',
  'viet nam': 'VN',
  
  // África
  'argelia': 'DZ',
  'algeria': 'DZ',
  'angola': 'AO',
  'camerún': 'CM',
  'camerun': 'CM',
  'cameroon': 'CM',
  'egipto': 'EG',
  'egypt': 'EG',
  'etiopía': 'ET',
  'etiopia': 'ET',
  'ethiopia': 'ET',
  'ghana': 'GH',
  'kenia': 'KE',
  'kenya': 'KE',
  'libia': 'LY',
  'libya': 'LY',
  'marruecos': 'MA',
  'morocco': 'MA',
  'nigeria': 'NG',
  'senegal': 'SN',
  'sudáfrica': 'ZA',
  'sudafrica': 'ZA',
  'south africa': 'ZA',
  'sudán': 'SD',
  'sudan': 'SD',
  'tanzania': 'TZ',
  'túnez': 'TN',
  'tunez': 'TN',
  'tunisia': 'TN',
  'uganda': 'UG',
  'zimbabue': 'ZW',
  'zimbabwe': 'ZW',
  
  // Oceanía
  'australia': 'AU',
  'nueva zelanda': 'NZ',
  'new zealand': 'NZ',
  'fiji': 'FJ',
  'papúa nueva guinea': 'PG',
  'papua nueva guinea': 'PG',
  'papua new guinea': 'PG',
};

/**
 * Convierte un código ISO de 2 letras a emoji de bandera
 * Los emojis de banderas se forman con caracteres Regional Indicator Symbol
 * A = 🇦 (U+1F1E6), B = 🇧 (U+1F1E7), etc.
 * @param {string} isoCode - Código ISO de 2 letras (ej: "CO", "MX")
 * @returns {string} Emoji de bandera
 */
const isoToFlagEmoji = (isoCode) => {
  if (!isoCode || isoCode.length !== 2) return '🌎';
  
  return isoCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};

/**
 * Obtiene el emoji de bandera a partir del nombre del país
 * @param {string} countryName - Nombre del país (en español o inglés)
 * @returns {string} Emoji de bandera o 🌎 si no se encuentra
 */
export const getCountryFlag = (countryName) => {
  if (!countryName) return '🌎';
  
  // Normalizar: minúsculas y sin espacios extras
  const normalized = countryName.toLowerCase().trim();
  
  // Buscar en el mapeo
  const isoCode = countryToISO[normalized];
  
  if (isoCode) {
    return isoToFlagEmoji(isoCode);
  }
  
  // Si no se encuentra, devolver emoji genérico
  return '🌎';
};

/**
 * Obtiene el código ISO a partir del nombre del país
 * @param {string} countryName - Nombre del país
 * @returns {string|null} Código ISO o null si no se encuentra
 */
export const getCountryISO = (countryName) => {
  if (!countryName) return null;
  return countryToISO[countryName.toLowerCase().trim()] || null;
};

export default getCountryFlag;
