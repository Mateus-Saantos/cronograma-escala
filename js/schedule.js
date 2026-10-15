
/* ==============|>> script.js linhas => 140 - 214 <<|==============
 *
 * Responsabilidade:
 * - Utilidades de data
 * - Cálculo das escalas 12x36, 5x2 e personalizada
 */

// Converte uma data no formato "AAAA-MM-DD"
// em uma data local, evitando problemas de fuso horário.
export function parseLocalDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Converte uma data para o formato "AAAA-MM-DD".
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Verifica se duas datas representam o mesmo dia.
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Calcula a diferença entre dias sem depender
// da quantidade de horas do dia por causa do horário de verão.
export function daysBetween(dateA, dateB) {
  const utcA = Date.UTC(
    dateA.getFullYear(),
    dateA.getMonth(),
    dateA.getDate()
  );

  const utcB = Date.UTC(
    dateB.getFullYear(),
    dateB.getMonth(),
    dateB.getDate()
  );

  return Math.round((utcA - utcB) / 86400000);
}

// Calcula uma escala cíclica de trabalho e folga.
export function calculateBlockCycle(
  date,
  refDate,
  refStatus,
  workDays,
  offDays
) {
  const cycleLen = workDays + offDays;
  const diff = daysBetween(date, refDate);
  const mod = ((diff % cycleLen) + cycleLen) % cycleLen;

  if (refStatus === 'trabalho') {
    return mod < workDays ? 'trabalho' : 'folga';
  }

  return mod < offDays ? 'folga' : 'trabalho';
}

// Escala 12x36: um dia de trabalho e um de folga.
export function calculate12x36(date, config) {
  const ref = parseLocalDateKey(config.referenceDate);

  return calculateBlockCycle(
    date,
    ref,
    config.referenceStatus,
    1,
    1
  );
}

// Escala 5x2: cinco dias de trabalho e dois de folga.
export function calculate5x2(date, config) {
  const ref = parseLocalDateKey(config.referenceDate);

  return calculateBlockCycle(
    date, ref, config.referenceStatus, 5, 2
  );
}

// Escala personalizada.
export function calculateCustom(date, config) {
  const ref = parseLocalDateKey(config.referenceDate);
  const work = Math.max(1, parseInt(config.custom?.trabalho, 10) || 1);
  const off = Math.max(1, parseInt(config.custom?.folga, 10) || 1);
  return calculateBlockCycle(date, ref, config.referenceStatus, work, off);
}

// Escolhe qual cálculo utilizar conforme o tipo configurado.
export function calculateScheduleDate(date, config) {
  switch (config.tipo) {
    case '5x2':
      return calculate5x2(date, config);

    case 'personalizada':
      return calculateCustom(date, config);

    case '12x36':
    default:
      return calculate12x36(date, config);
  }
}
