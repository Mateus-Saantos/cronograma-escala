/* =========================================================
   compare.js
   Responsabilidade:
   - Comparar estados do calendário (config, overrides, ferias)
     ignorando a ordem das chaves dos objetos.
   ========================================================= */

function normalizar(valor) {
  if (Array.isArray(valor)) {
    return valor.map(normalizar);
  }

  if (valor && typeof valor === 'object') {
    const resultado = {};

    Object.keys(valor)
      .sort()
      .forEach((chave) => {
        if (valor[chave] !== undefined) {
          resultado[chave] = normalizar(valor[chave]);
        }
      });

    return resultado;
  }

  return valor;
}

export function stableStringify(valor) {
  return JSON.stringify(normalizar(valor));
}

export function mesmoEstado(a, b) {
  const x = a || {};
  const y = b || {};

  return stableStringify({
    config: x.config ?? null,
    overrides: x.overrides || {},
    ferias: x.ferias || []
  }) === stableStringify({
    config: y.config ?? null,
    overrides: y.overrides || {},
    ferias: y.ferias || []
  });
}