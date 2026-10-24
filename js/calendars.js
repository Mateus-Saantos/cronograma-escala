/* ==============|>>  <<|==============
   calendars.js
   Responsabilidade:
   - Gerenciar a identidade e o registro dos calendários locais.
   - Identificar o calendário ativo.

   As dependências são recebidas por parâmetro para permitir
   a separação do módulo sem alterar o comportamento atual.
   ========================================================= */

/* ---------- Identificação dos calendários ---------- */

export function gerarCalendarioId({
  now = Date.now,
  random = Math.random
} = {}) {
  return 'cal_' + now().toString(36) + random().toString(36).slice(2, 8);
}

export function calendarStorageKey(baseKey, calendarId) {
  return `${baseKey}::${calendarId}`;
}


/* ---------- Registro "Meus Calendários" ---------- */

export function getMyCalendars({
  storage = localStorage,
  MY_CALENDARS_STORAGE_KEY
}) {
  try {
    const raw = storage.getItem(MY_CALENDARS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler Meus Calendários:', e);
    return [];
  }
}

export function saveMyCalendars(lista, {
  storage = localStorage,
  MY_CALENDARS_STORAGE_KEY
}) {
  try {
    storage.setItem(
      MY_CALENDARS_STORAGE_KEY,
      JSON.stringify(lista)
    );
  } catch (e) {
    console.error('Erro ao salvar Meus Calendários:', e);
  }
}

// Cria ou atualiza a entrada de um calendário no registro
// usando mesclagem parcial. (merge parcial)
export function registrarCalendario(localId, dados, dependencies) {
  const lista = getMyCalendars(dependencies);
  const idx = lista.findIndex(c => c.localId === localId);

  if (idx === -1) {
    lista.push({
      localId,
      cloudId: null,
      name: '',
      type: '12x36',
      ...dados
    });
  } else {
    lista[idx] = { ...lista[idx], ...dados };
  }

  saveMyCalendars(lista, dependencies);
}

/* ---------- Calendário ativo ---------- */
export function getActiveCalendarId({
  storage = localStorage,
  ACTIVE_CALENDAR_STORAGE_KEY
}) {
  return storage.getItem(ACTIVE_CALENDAR_STORAGE_KEY);
}
