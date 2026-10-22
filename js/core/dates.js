/*=======================================================
core/dates.js

Responsabilidade:
- Utilidades de data
- Conversão entre datas locais e chaves AAAA-MM-DD
- Comparação e diferença entre dias
=======================================================*/

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
