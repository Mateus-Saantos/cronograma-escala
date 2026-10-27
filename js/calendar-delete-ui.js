/* =========================================================
   calendar-delete-ui.js
   Responsabilidade:
   - Popup de confirmação da exclusão de um calendário.
   - Exigir a digitação exata do nome (ou de "excluir" quando
     o calendário não tem nome) antes de liberar o botão.
   ========================================================= */

import { openOverlay, closeOverlay } from './utils/dom.js';

const PALAVRA_SEM_NOME = 'excluir';

export function createCalendarDeleteUI({
  excluirCalendario,
  refreshCalendarsList
}) {
  const overlay = document.getElementById('deleteCalendarOverlay');
  const closeBtn = document.getElementById('deleteCalendarClose');
  const nameEl = document.getElementById('deleteCalendarName');
  const warningEl = document.getElementById('deleteCalendarWarning');
  const promptEl = document.getElementById('deleteCalendarPrompt');
  const input = document.getElementById('deleteCalendarInput');
  const cancelBtn = document.getElementById('deleteCalendarCancel');
  const confirmBtn = document.getElementById('deleteCalendarConfirm');

  let alvo = null;
  let textoEsperado = '';
  let excluindo = false;

  function atualizarConfirmar() {
    // Comparação exata: diferencia maiúsculas e minúsculas e espaços.
    confirmBtn.disabled = excluindo || input.value !== textoEsperado;
  }

  function openDeleteModal(calendario) {
    const semNome = !calendario.name;

    alvo = calendario;
    textoEsperado = semNome ? PALAVRA_SEM_NOME : calendario.name;

    nameEl.textContent = semNome ? '(sem nome)' : `“${calendario.name}”`;

    warningEl.textContent = calendario.cloudId
      ? 'Esta ação é permanente. O calendário será apagado deste aparelho e da nuvem.'
      : 'Esta ação é permanente. O calendário será apagado deste aparelho.';

    promptEl.textContent = semNome
      ? 'Para confirmar, digite a palavra excluir:'
      : 'Para confirmar, digite o nome do calendário:';

    input.value = '';
    atualizarConfirmar();
    openOverlay(overlay);
    input.focus();
  }

  function fechar() {
    if (excluindo) return;
    closeOverlay(overlay);
    alvo = null;
  }

  async function confirmar() {
    if (!alvo || excluindo || input.value !== textoEsperado) return;

    excluindo = true;
    confirmBtn.textContent = 'Excluindo…';
    cancelBtn.disabled = true;
    atualizarConfirmar();

    const ok = await excluirCalendario(alvo.localId);

    excluindo = false;
    confirmBtn.textContent = 'Excluir calendário';
    cancelBtn.disabled = false;

    if (ok) {
      closeOverlay(overlay);
      alvo = null;
      refreshCalendarsList();
    } else {
      atualizarConfirmar();
    }
  }

  input.addEventListener('input', atualizarConfirmar);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmar();
  });

  closeBtn.addEventListener('click', fechar);
  cancelBtn.addEventListener('click', fechar);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) fechar();
  });

  confirmBtn.addEventListener('click', confirmar);

  return { openDeleteModal };
}