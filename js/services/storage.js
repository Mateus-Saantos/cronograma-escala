/* ==============|>> script.js linhas => 215 - 290 <<|==============
/*
 * Responsabilidade:
 * - Carregar e salvar a configuração da escala.
 * - Carregar e salvar edições manuais por dia.
 * - Carregar e salvar férias planejadas.
 * - Verificar se já existe configuração armazenada.
 *
 * As dependências são recebidas por parâmetro para permitir
 * a separação do módulo sem alterar o comportamento atual.
 */

export function loadConfig({
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG
}) {
  try {
    const raw = storage.getItem(
      calendarStorageKey(
        CONFIG_STORAGE_KEY,
        getActiveCalendarId()
      )
    );

    if (raw) {
      return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
    }
  } catch (e) {
    console.error('Erro ao ler configuração:', e);
  }

  return Object.assign({}, DEFAULT_CONFIG);
}

export function saveConfig(config, {
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  CONFIG_STORAGE_KEY
}) {
  try {
    storage.setItem(
      calendarStorageKey(
        CONFIG_STORAGE_KEY,
        getActiveCalendarId()
      ),
      JSON.stringify(config)
    );
  } catch (e) {
    console.error('Erro ao salvar configuração:', e);
  }
}

export function hasStoredConfig({
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  CONFIG_STORAGE_KEY
}) {
  return storage.getItem(
    calendarStorageKey(
      CONFIG_STORAGE_KEY,
      getActiveCalendarId()
    )
  ) !== null;
}

export function loadOverrides({
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  OVERRIDES_STORAGE_KEY
}) {
  try {
    const raw = storage.getItem(
      calendarStorageKey(
        OVERRIDES_STORAGE_KEY,
        getActiveCalendarId()
      )
    );

    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Erro ao ler edições:', e);
    return {};
  }
}

export function saveOverrides(overrides, {
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  OVERRIDES_STORAGE_KEY
}) {
  try {
    storage.setItem(
      calendarStorageKey(
        OVERRIDES_STORAGE_KEY,
        getActiveCalendarId()
      ),
      JSON.stringify(overrides)
    );
  } catch (e) {
    console.error('Erro ao salvar edições:', e);
  }
}


/* ---------- Persistência: modo visualização ----------
    Em modo visualização, as edições vêm do cronograma carregado (memória),
    nunca do localStorage do dispositivo. */

export function getActiveOverrides({
  isViewOnly,
  viewOnlyOverrides,
  ...storageDependencies
}) {
  return isViewOnly
    ? viewOnlyOverrides
    : loadOverrides(storageDependencies);
}


/* ---------- Persistência: férias planejadas ----------
   Cada período é um registro independente { id, dataInicio, quantidadeDias }.
   Isso NUNCA altera a escala base — é apenas consultado na hora de renderizar,
   como uma camada de sobreposição visual (ver getFeriasParaData). */

export function loadFerias({
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  FERIAS_STORAGE_KEY
}) {
  try {
    const raw = storage.getItem(
      calendarStorageKey(
        FERIAS_STORAGE_KEY,
        getActiveCalendarId()
      )
    );

    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler férias:', e);
    return [];
  }
}

export function saveFerias(lista, {
  storage = localStorage,
  calendarStorageKey,
  getActiveCalendarId,
  FERIAS_STORAGE_KEY
}) {
  try {
    storage.setItem(
      calendarStorageKey(
        FERIAS_STORAGE_KEY,
        getActiveCalendarId()
      ),
      JSON.stringify(lista)
    );
  } catch (e) {
    console.error('Erro ao salvar férias:', e);
  }
}

export function getActiveFerias({
  isViewOnly,
  viewOnlyFerias,
  ...storageDependencies
}) {
  return isViewOnly
    ? viewOnlyFerias
    : loadFerias(storageDependencies);
}
