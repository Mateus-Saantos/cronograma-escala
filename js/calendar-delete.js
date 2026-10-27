/* =========================================================
   calendar-delete.js
   Responsabilidade:
   - Excluir um calendário: nuvem, registro local e dados locais.
   - Trocar para outro calendário ou deixar o app sem calendário.
   ========================================================= */

import {
  calendarStorageKey,
  getMyCalendars,
  removerCalendarioDoRegistro
} from './calendars.js';
import { excluirCronograma } from './services/firebase.js';
import { showToast } from './utils/dom.js';

export function createCalendarDeleter({
  calendarDependencies,
  ACTIVE_CALENDAR_STORAGE_KEY,
  storageKeyBases,
  cloudDisponivel,
  switchToCalendar,
  onNoCalendars
}) {
  const { CLOUD_ID_STORAGE_KEY } = storageKeyBases;

  /*
   * Retorna true se o calendário foi excluído, false caso contrário.
   * Ordem: nuvem -> registro -> calendário ativo -> dados locais.
   */
  async function excluirCalendario(localId) {
    const calendario = getMyCalendars(calendarDependencies)
      .find(c => c.localId === localId);

    if (!calendario) {
      showToast('Calendário não encontrado');
      return false;
    }

    const cloudId =
      calendario.cloudId ||
      localStorage.getItem(
        calendarStorageKey(CLOUD_ID_STORAGE_KEY, localId)
      );

    /* 1) Nuvem primeiro: se falhar, nada local é alterado. */
    if (cloudId) {
      if (!cloudDisponivel()) {
        showToast(
          'Sem conexão — não é possível excluir este calendário agora'
        );
        return false;
      }

      try {
        await excluirCronograma(cloudId);
      } catch (error) {
        console.error('Erro ao excluir calendário na nuvem:', error);
        showToast('Não foi possível excluir na nuvem. Nada foi apagado.');
        return false;
      }
    }

    /* 2) Registro local. */
    removerCalendarioDoRegistro(localId, calendarDependencies);

    /* 3) Calendário ativo: próximo da lista ou nenhum. */
    const eraAtivo =
      localStorage.getItem(ACTIVE_CALENDAR_STORAGE_KEY) === localId;

    let proximo = null;

    if (eraAtivo) {
      proximo = getMyCalendars(calendarDependencies)[0] || null;

      if (proximo) {
        switchToCalendar(proximo.localId);
      } else {
        localStorage.removeItem(ACTIVE_CALENDAR_STORAGE_KEY);
      }
    }

    /* 4) Dados locais do calendário. */
    Object.values(storageKeyBases).forEach(base => {
      localStorage.removeItem(calendarStorageKey(base, localId));
    });

    if (eraAtivo && !proximo) onNoCalendars();

    showToast('Calendário excluído');
    return true;
  }

  return { excluirCalendario };
}