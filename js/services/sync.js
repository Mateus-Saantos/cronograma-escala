/* =========================================================
   sync.js
   Responsabilidade:
   - Controlar alterações locais não salvas.
   - Registrar o último estado confirmado na nuvem.
   - Salvar alterações explicitamente no Firebase.
   - Gerenciar o ID remoto do calendário.
   ========================================================= */

/*
 * As dependências são recebidas na inicialização para que este
 * módulo possa ser conectado aos outros arquivos sem depender
 * de variáveis que antes estavam no mesmo script.js.
 *
 * A lógica das funções abaixo foi mantida com base no original.
 */

import {
  atualizarCronograma,
  carregarCronogramaPorId,
  salvarCronograma
} from './firebase.js';
import { mesmoEstado } from '../utils/compare.js';

export function createSyncModule({
  getActiveCalendarId,
  calendarStorageKey,
  DIRTY_STORAGE_KEY,
  SYNCED_STATE_STORAGE_KEY,
  CLOUD_ID_STORAGE_KEY,
  loadConfig,
  loadOverrides,
  loadFerias,
  registrarCalendario,
  showToast,
  DEFAULT_CONFIG
}) {
  /* ---------- Estado de alterações não salvas ---------- */

  function hasUnsavedChanges() {
    const id = getActiveCalendarId();
    if (!id) return false;

    return localStorage.getItem(
      calendarStorageKey(DIRTY_STORAGE_KEY, id)
    ) === '1';
  }

  function markCalendarAsDirty() {
    const id = getActiveCalendarId();
    if (!id) return;

    localStorage.setItem(
      calendarStorageKey(DIRTY_STORAGE_KEY, id),
      '1'
    );

    updateDirtyIndicator();
  }

  function clearCalendarDirty() {
    const id = getActiveCalendarId();
    if (!id) return;

    localStorage.setItem(
      calendarStorageKey(DIRTY_STORAGE_KEY, id),
      '0'
    );

    updateDirtyIndicator();
  }

  function updateDirtyIndicator() {
    const btn = document.getElementById('saveButton');
    if (!btn) return;

    const dirty = hasUnsavedChanges();
    btn.style.display = dirty ? '' : 'none';

    if (dirty && !btn.disabled) {
      btn.textContent = 'Salvar';
    }
  }

  /* ---------- Estado sincronizado ---------- */

  function loadSyncedState() {
    try {
      const raw = localStorage.getItem(
        calendarStorageKey(
          SYNCED_STATE_STORAGE_KEY,
          getActiveCalendarId()
        )
      );

      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Erro ao ler estado sincronizado:', e);
      return null;
    }
  }

  function saveSyncedState(estado) {
    try {
      localStorage.setItem(
        calendarStorageKey(
          SYNCED_STATE_STORAGE_KEY,
          getActiveCalendarId()
        ),
        JSON.stringify(estado)
      );
    } catch (e) {
      console.error('Erro ao salvar estado sincronizado:', e);
    }
  }

  /* ---------- Salvamento explícito ---------- */

  let salvandoEmAndamento = false;

  function updateSaveButton(estado) {
    const btn = document.getElementById('saveButton');
    if (!btn) return;

    clearTimeout(updateSaveButton._t);

    if (estado === 'saving') {
      btn.style.display = '';
      btn.textContent = 'Salvando...';
      btn.disabled = true;
    } else if (estado === 'saved') {
      btn.style.display = '';
      btn.textContent = 'Salvo';
      btn.disabled = true;

      updateSaveButton._t = setTimeout(() => {
        btn.disabled = false;
        updateDirtyIndicator();
      }, 1200);
    } else if (estado === 'error') {
      btn.style.display = '';
      btn.textContent = 'Tentar novamente';
      btn.disabled = false;
    } else {
      btn.disabled = false;
      updateDirtyIndicator();
    }
  }

  async function salvarAlteracoes() {
    if (salvandoEmAndamento) return;

    const cloudId = getCloudId();

    if (!cloudId) {
      showToast(
        'Este calendário ainda não tem um documento remoto pra salvar.'
      );
      return;
    }

    if (!cloudDisponivel()) {
      showToast(
        'Não foi possível salvar agora. Suas alterações continuam neste dispositivo.'
      );
      return;
    }

    salvandoEmAndamento = true;
    updateSaveButton('saving');

    try {
      const atual = {
        config: loadConfig(),
        overrides: loadOverrides(),
        ferias: loadFerias()
      };

      const sincronizado = loadSyncedState();

      let camposParaEnviar = atual;
      let usarUpdateParcial = false;

      if (sincronizado) {
        const alterados = {};

        if (
          JSON.stringify(atual.config) !==
          JSON.stringify(sincronizado.config)
        ) {
          alterados.config = atual.config;
        }

        if (
          JSON.stringify(atual.overrides) !==
          JSON.stringify(sincronizado.overrides)
        ) {
          alterados.overrides = atual.overrides;
        }

        if (
          JSON.stringify(atual.ferias) !==
          JSON.stringify(sincronizado.ferias)
        ) {
          alterados.ferias = atual.ferias;
        }

        if (Object.keys(alterados).length === 0) {
          clearCalendarDirty();
          updateSaveButton('idle');
          showToast('Nada para salvar');
          return;
        }

        camposParaEnviar = alterados;
        usarUpdateParcial = true;
      }

      if (usarUpdateParcial) {
        await atualizarCronograma(
          cloudId,
          camposParaEnviar
        );
      } else {
        await salvarCronograma(
          camposParaEnviar,
          cloudId
        );
      }

      saveSyncedState(atual);
      clearCalendarDirty();
      updateSaveButton('saved');
    } catch (e) {
      console.error('Erro ao salvar alterações:', e);
      updateSaveButton('error');

      showToast(
        'Não foi possível salvar agora. Suas alterações continuam neste dispositivo.'
      );
    } finally {
      salvandoEmAndamento = false;
    }
  }

  /* ---------- Persistência do ID remoto ---------- */

  function getCloudId() {
    return localStorage.getItem(
      calendarStorageKey(
        CLOUD_ID_STORAGE_KEY,
        getActiveCalendarId()
      )
    );
  }

  function setCloudId(id) {
    const activeId = getActiveCalendarId();

    localStorage.setItem(
      calendarStorageKey(CLOUD_ID_STORAGE_KEY, activeId),
      id
    );

    if (activeId) {
      registrarCalendario(activeId, { cloudId: id });
    }
  }

  function cloudDisponivel() {
    return navigator.onLine;
  }

    /* ---------- Divergência local × nuvem ---------- */
  /*
   * Compara três estados: base (último sincronizado neste aparelho),
   * local (localStorage) e nuvem (Firestore).
   *
   * Status possíveis:
   * 'sem-nuvem'        calendário sem documento remoto (ou não encontrado)
   * 'offline'          sem conexão ou falha ao consultar a nuvem
   * 'cancelado'        o calendário ativo mudou durante a consulta
   * 'igual'            local e nuvem idênticos
   * 'local-adiante'    só o local mudou (fluxo normal do botão Salvar)
   * 'nuvem-atualizada' só a nuvem mudou (seguro carregar a nuvem)
   * 'conflito'         os dois mudaram, ou não há base para saber
   *
   * Efeito colateral: quando local e nuvem são idênticos e a base
   * está ausente ou desatualizada, a base passa a ser a nuvem.
   */
  async function verificarDivergencia() {
    const idInicial = getActiveCalendarId();
    const cloudId = getCloudId();

    if (!cloudId) return { status: 'sem-nuvem' };
    if (!cloudDisponivel()) return { status: 'offline' };

    let remoto;

    try {
      remoto = await carregarCronogramaPorId(cloudId);
    } catch (e) {
      console.error('Erro ao consultar a nuvem:', e);
      return { status: 'offline' };
    }
    if (getActiveCalendarId() !== idInicial) {
      return { status: 'cancelado' };
    }

    if (!remoto || !remoto.config) return { status: 'sem-nuvem' };

    const normalizar = (estado) => ({
      config: { ...DEFAULT_CONFIG, ...(estado.config || {}) },
      overrides: estado.overrides || {},
      ferias: estado.ferias || []
    });

    const nuvem = normalizar(remoto);

    const local = normalizar({
      config: loadConfig(),
      overrides: loadOverrides(),
      ferias: loadFerias()
    });

    const sincronizado = loadSyncedState();
    const base = sincronizado ? normalizar(sincronizado) : null;

    const resultado = { cloudId, nuvem, local };

    if (mesmoEstado(local, nuvem)) {
      if (!base || !mesmoEstado(base, nuvem)) {
        saveSyncedState(nuvem);
      }
      return { ...resultado, status: 'igual' };
    }
    if (!base) {
      return { ...resultado, status: 'conflito' };
    }

    const nuvemMudou = !mesmoEstado(base, nuvem);
    const localMudou = !mesmoEstado(base, local);

    if (nuvemMudou && localMudou) {
      return { ...resultado, status: 'conflito' };
    }
    if (nuvemMudou) {
      return { ...resultado, status: 'nuvem-atualizada' };
    }

    return { ...resultado, status: 'local-adiante' };
  }

  /* ---------- Sobrescrever a nuvem com a versão local ---------- */
  /*
   * Resolve um conflito mantendo a versão deste aparelho: substitui
   * o documento remoto inteiro e atualiza a base de sincronização.
   * Retorna true em caso de sucesso.
   */
  async function sobrescreverNuvemComLocal() {
    if (salvandoEmAndamento) return false;

    const cloudId = getCloudId();

    if (!cloudId) {
      showToast(
        'Este calendário ainda não tem um documento remoto pra salvar.'
      );
      return false;
    }

    if (!cloudDisponivel()) {
      showToast(
        'Não foi possível salvar agora. Suas alterações continuam neste dispositivo.'
      );
      return false;
    }

    salvandoEmAndamento = true;
    updateSaveButton('saving');

    try {
      const atual = {
        config: loadConfig(),
        overrides: loadOverrides(),
        ferias: loadFerias()
      };

      await salvarCronograma(atual, cloudId);

      saveSyncedState(atual);
      clearCalendarDirty();
      updateSaveButton('saved');

      return true;
    } catch (e) {
      console.error('Erro ao sobrescrever a nuvem:', e);
      updateSaveButton('error');

      showToast(
        'Não foi possível salvar agora. Suas alterações continuam neste dispositivo.'
      );

      return false;
    } finally {
      salvandoEmAndamento = false;
    }
  }

  /* ---------- Conexão com a interface ---------- */

  function initSyncUI() {
    const saveButtonEl = document.getElementById('saveButton');

    if (saveButtonEl) {
      saveButtonEl.addEventListener('click', salvarAlteracoes);
    }

    document.addEventListener('keydown', (e) => {
      const teclaSalvar =
        (e.key === 's' || e.key === 'S') &&
        (e.ctrlKey || e.metaKey);

      if (!teclaSalvar) return;

      e.preventDefault();
      salvarAlteracoes();
    });

    // Mantém os mesmos pontos de acesso globais do original.
    window.hasUnsavedChanges = hasUnsavedChanges;
    window.markCalendarAsDirty = markCalendarAsDirty;
    window.clearCalendarDirty = clearCalendarDirty;
    window.__verificarDivergencia = sobrescreverNuvemComLocal; // TEMPORÁRIO: remover na Etapa 5
  }

  return {
    hasUnsavedChanges,
    markCalendarAsDirty,
    clearCalendarDirty,
    updateDirtyIndicator,
    loadSyncedState,
    saveSyncedState,
    updateSaveButton,
    salvarAlteracoes,
    getCloudId,
    setCloudId,
    cloudDisponivel,
    verificarDivergencia,
    sobrescreverNuvemComLocal,
    initSyncUI
  };
}
