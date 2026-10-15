/*
 * Responsabilidade:
 * - Gerar identificadores para períodos de férias.
 * - Identificar qual período cobre uma determinada data.
 * - Formatar as datas de início e fim de um período.
 *
 * As funções de data são recebidas por parâmetro para manter
 * este módulo independente de outros arquivos.
 */

export function gerarFeriasId() {
  return 'f_' + Date.now().toString(36)
    + Math.random().toString(36).slice(2, 6);
}

/*
 * Retorna o registro de férias que cobre "date", ou null.
 * Não altera nem consulta a escala: apenas verifica a
 * sobreposição de datas.
 */
export function getFeriasParaData(date, listaFerias, {
  parseLocalDateKey,
  daysBetween
}) {
  for (const f of listaFerias) {
    const inicio = parseLocalDateKey(f.dataInicio);
    const dias = Math.max(
      1,
      parseInt(f.quantidadeDias, 10) || 1
    );

    const diff = daysBetween(date, inicio);

    if (diff >= 0 && diff < dias) {
      return f;
    }
  }

  return null;
}

export function formatFeriasRange(f, {
  parseLocalDateKey
}) {
  const inicio = parseLocalDateKey(f.dataInicio);
  const dias = Math.max(
    1,
    parseInt(f.quantidadeDias, 10) || 1
  );

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + dias - 1);

  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')
    }/${d.getFullYear()}`;

  return `${fmt(inicio)} até ${fmt(fim)}`;
}

