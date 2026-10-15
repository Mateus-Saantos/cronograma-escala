/* ==============|>> script.js linhas => 48 - 131 <<|==============
   calendars.js
   Responsabilidade:
   - Gerenciar a identidade e o registro dos calendários locais.
   - Identificar o calendário ativo.
   - Migrar os dados antigos para o formato por calendário.

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


/* ---------- Migração dos dados antigos ---------- */

/**
 * Migração única e idempotente:
 * se ainda não houver calendário ativo, cria o primeiro
 * calendário e copia os dados antigos para as novas chaves.
 *
 * As chaves antigas não são apagadas.
 *
 * Esta função é exportada, mas não é executada automaticamente
 * neste módulo. A inicialização será conectada posteriormente.
 */
export function migrarParaMeusCalendarios({
  storage = localStorage,
  MY_CALENDARS_STORAGE_KEY,
  ACTIVE_CALENDAR_STORAGE_KEY,
  CONFIG_STORAGE_KEY,
  OVERRIDES_STORAGE_KEY,
  FERIAS_STORAGE_KEY,
  CLOUD_ID_STORAGE_KEY
}) {
  const registryDependencies = {
    storage,
    MY_CALENDARS_STORAGE_KEY
  };

  const activeDependencies = {
    storage,
    ACTIVE_CALENDAR_STORAGE_KEY
  };

  if (getActiveCalendarId(activeDependencies)) return;

  const configAntigo = storage.getItem(CONFIG_STORAGE_KEY);
  const overridesAntigo = storage.getItem(OVERRIDES_STORAGE_KEY);
  const feriasAntigo = storage.getItem(FERIAS_STORAGE_KEY);
  const cloudIdAntigo = storage.getItem(CLOUD_ID_STORAGE_KEY);

  const novoId = gerarCalendarioId();
  let nome = '', tipo = '12x36';

  // Copia os dados existentes para as chaves específicas
  // do novo calendário, sem remover as chaves antigas.
  if (configAntigo) {
    storage.setItem(
      calendarStorageKey(CONFIG_STORAGE_KEY, novoId),
      configAntigo
    );

    try {
      const cfg = JSON.parse(configAntigo);
      nome = cfg.nome || '';
      tipo = cfg.tipo || '12x36';
    } catch (e) {
      console.error(
        'Erro ao ler configuração antiga durante a migração:',
        e
      );
    }
  }

  if (overridesAntigo) {
    storage.setItem(
      calendarStorageKey(OVERRIDES_STORAGE_KEY, novoId),
      overridesAntigo
    );
  }

  if (feriasAntigo) {
    storage.setItem(
      calendarStorageKey(FERIAS_STORAGE_KEY, novoId),
      feriasAntigo
    );
  }

  if (cloudIdAntigo) {
    storage.setItem(
      calendarStorageKey(CLOUD_ID_STORAGE_KEY, novoId),
      cloudIdAntigo
    );
  }

  registrarCalendario(
    novoId,
    {
      name: nome,
      type: tipo,
      cloudId: cloudIdAntigo || null
    },
    registryDependencies
  );

  storage.setItem(ACTIVE_CALENDAR_STORAGE_KEY, novoId);
}
