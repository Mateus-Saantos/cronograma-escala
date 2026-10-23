/* =========================================================
   sync-conflict-ui.js
   Responsabilidade:
   - Verificar divergência entre o calendário local e a nuvem
   - Atualizar sozinho quando só a nuvem mudou
   - Mostrar aviso e modal quando há conflito
   ========================================================= */

import { state } from './state.js';
import { showToast, openOverlay, closeOverlay } from './utils/dom.js';

export function createSyncConflictUI({
  verificarDivergencia,
  sobrescreverNuvemComLocal,
  hasUnsavedChanges,
  usarNuvem
}) {
  const banner = document.getElementById('syncBanner');
  const bannerBtn = document.getElementById('syncBannerBtn');
  const overlay = document.getElementById('syncConflictOverlay');
  const closeBtn = document.getElementById('syncConflictClose');
  const keepBtn = document.getElementById('syncConflictKeep');
  const useBtn = document.getElementById('syncConflictUse');

  let verificando = false;

  function showBanner() {
    banner?.classList.add('show');
  }

  function hideBanner() {
    banner?.classList.remove('show');
  }

  /*
   * Verifica a nuvem e reage ao resultado.
   * Retorna o objeto de verificarDivergencia(), ou um status próprio:
   * 'ignorado' (modo de visualização) ou 'ocupado' (já verificando).
   */
  async function checarNuvem() {
    if (state.isViewOnly) {
      hideBanner();
      return { status: 'ignorado' };
    }

    if (verificando) return { status: 'ocupado' };

    verificando = true;

    try {
      const resultado = await verificarDivergencia();
      console.log('[SYNC] Resultado da verificação:', resultado);

      if (resultado.status === 'conflito') {
        showBanner();
        return resultado;
      }

      if (resultado.status === 'nuvem-atualizada') {
        // Edição feita durante a consulta: não descartar, tratar como conflito.
        if (hasUnsavedChanges()) {
          showBanner();
          return { ...resultado, status: 'conflito' };
        }

        const ok = await usarNuvem();

        if (ok) {
          hideBanner();
          showToast('Atualizado com a versão da nuvem');
        }

        return resultado;
      }

      if (resultado.status === 'igual' || resultado.status === 'local-adiante') {
        hideBanner();
      }

      return resultado;
    } finally {
      verificando = false;
    }
  }

  bannerBtn?.addEventListener('click', () => openOverlay(overlay));

  closeBtn?.addEventListener('click', () => closeOverlay(overlay));

  useBtn?.addEventListener('click', async () => {
    closeOverlay(overlay);

    const ok = await usarNuvem();

    if (ok) {
      hideBanner();
      showToast('Atualizado com a versão da nuvem');
    }
  });

  keepBtn?.addEventListener('click', async () => {
    closeOverlay(overlay);

    const ok = await sobrescreverNuvemComLocal();

    if (ok) {
      hideBanner();
      showToast('Versão deste aparelho salva na nuvem');
    }
  });

  document.addEventListener('sync:divergencia', () => {
    checarNuvem();
  });

  return { checarNuvem, esconderAviso: hideBanner };
}