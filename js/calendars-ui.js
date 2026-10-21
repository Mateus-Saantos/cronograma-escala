/* =========================================================
   calendars-ui.js
   Responsabilidade:
   - Renderizar a lista "Meus Calendários".
   - Abrir e fechar as janelas de calendários.
   - Tratar os cliques para selecionar, carregar ou criar.
   - Delegar as operações aos módulos responsáveis.
   ========================================================= */


import {
  openOverlay,
  closeOverlay
} from './utils/dom.js';

const TIPO_LABELS = {
  '12x36': '12x36',
  '5x2': '5x2',
  'personalizada': 'Personalizada'
};

export function renderMyCalendarsList({
  getMyCalendars,
  getActiveCalendarId,
  switchToCalendar,
  showToast,
  myCalendarsListContent,
  myCalendarsOverlay
}) {
  const lista = getMyCalendars();
  const activeId = getActiveCalendarId();

  if (!lista.length) {
    myCalendarsListContent.innerHTML =
      '<p class="manager-empty">Nenhum calendário ainda.</p>';
    return;
  }

  myCalendarsListContent.innerHTML = '';

  lista.forEach(cal => {
    const isActive = cal.localId === activeId;
    const tipoLabel = TIPO_LABELS[cal.type] || cal.type || '--';

    const row = document.createElement('div');
    row.className = 'manager-item';

    row.innerHTML = `
      <div class="manager-item-info">
        <span class="manager-item-name"></span>
        <span class="manager-item-meta"></span>
      </div>
      ${isActive ? '' : '<button type="button">Selecionar</button>'}
    `;

    // Usa textContent para exibir os nomes como texto,
    // sem interpretar o nome como HTML.
    row.querySelector('.manager-item-name').textContent =
      cal.name || '(sem nome)';

    row.querySelector('.manager-item-meta').textContent =
      `${tipoLabel}${isActive ? ' · ● Ativo' : ''}`;

    if (!isActive) {
      row.querySelector('button').addEventListener('click', () => {
        switchToCalendar(cal.localId);
        closeOverlay(myCalendarsOverlay);
        showToast(`Agora em: ${cal.name || 'calendário'}`);
      });
    }

    myCalendarsListContent.appendChild(row);
  });
}

export function openMyCalendarsModal({
  renderList,
  myCalendarsOverlay
}) {
  renderList();
  openOverlay(myCalendarsOverlay);
}

/**
 * Conecta os eventos da interface de calendários.
 * Os elementos e as operações são fornecidos na inicialização.
 */
export function initCalendarsUI({
  elements,
  getMyCalendars,
  getActiveCalendarId,
  switchToCalendar,
  carregarCalendarioPorPrompt,
  criarNovoCalendarioLocal,
  showToast
}) {
  const {
    myCalendarsOverlay,
    myCalendarsClose,
    myCalendarsListContent,
    myCalendarsNewBtn,
    myCalendarsLoadBtn,
    newCalendarOverlay,
    newCalendarClose,
    newCalendarName,
    newCalendarType,
    newCalendarCancel,
    newCalendarCreate
  } = elements;

  const renderList = () => renderMyCalendarsList({
    getMyCalendars,
    getActiveCalendarId,
    switchToCalendar,
    showToast,
    myCalendarsListContent,
    myCalendarsOverlay
  });

  const openModal = () => openMyCalendarsModal({
    renderList,
    myCalendarsOverlay
  });

  myCalendarsClose.addEventListener('click', () => {
    closeOverlay(myCalendarsOverlay);
  });

  myCalendarsOverlay.addEventListener('click', e => {
    if (e.target === myCalendarsOverlay) {
      closeOverlay(myCalendarsOverlay);
    }
  });

  myCalendarsNewBtn.addEventListener('click', () => {
    newCalendarName.value = '';
    newCalendarType.value = '12x36';

    closeOverlay(myCalendarsOverlay);
    openOverlay(newCalendarOverlay);
  });

  myCalendarsLoadBtn.addEventListener('click', async () => {
    const ok = await carregarCalendarioPorPrompt();

    if (ok) {
      closeOverlay(myCalendarsOverlay);
    } else {
      renderList();
    }
  });

  newCalendarClose.addEventListener('click', () => {
    closeOverlay(newCalendarOverlay);
  });

  newCalendarCancel.addEventListener('click', () => {
    closeOverlay(newCalendarOverlay);
    openModal();
  });

  newCalendarOverlay.addEventListener('click', e => {
    if (e.target === newCalendarOverlay) {
      closeOverlay(newCalendarOverlay);
    }
  });

  newCalendarCreate.addEventListener('click', async () => {
    const nome = newCalendarName.value.trim();

    if (!nome) {
      showToast('Dê um nome pro calendário');
      return;
    }

    newCalendarCreate.disabled = true;
    showToast('Criando calendário...');

    try {
      const ok = await criarNovoCalendarioLocal(
        nome,
        newCalendarType.value
      );

      if (ok) {
        closeOverlay(newCalendarOverlay);
        showToast('Calendário criado!');
      }
    } finally {
      newCalendarCreate.disabled = false;
    }
  });

  return {
    renderMyCalendarsList: renderList,
    openMyCalendarsModal: openModal
  };
}
