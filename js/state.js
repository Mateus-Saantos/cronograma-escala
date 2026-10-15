
/*
 * Responsabilidade:
 * - Centralizar o estado em memória da aplicação.
 * - Manter a configuração atual e os dados temporários
 *   usados ao carregar calendários compartilhados.
 * - Controlar o modo de visualização.
 */

export const state = {
  // Configuração da escala que está sendo exibida.
  // Será preenchida durante a inicialização da aplicação.
  currentConfig: null,

  // Dados temporários de um calendário compartilhado,
  // aguardando uma decisão do usuário.
  pendingSharedConfig: null,
  pendingSharedOverrides: null,
  pendingSharedId: null,

  // Estado do modo de visualização.
  isViewOnly: false,
  viewOnlyOverrides: {},
  viewOnlyFerias: [],
  viewOnlyId: null
};
