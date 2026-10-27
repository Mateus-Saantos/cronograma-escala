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

const TRASH_BUTTON_HTML = `
  <button type="button" class="btn-trash" aria-label="Excluir calendário" title="Excluir calendário">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
    </svg>
  </button>`;

export function renderMyCalendarsList({
  getMyCalendars,
  getActiveCalendarId,
  switchToCalendar,
  onDeleteRequest,
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
      ${isActive ? TRASH_BUTTON_HTML : '<button type="button">Selecionar</button>'}
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

    if (isActive && onDeleteRequest) {
      row.querySelector('.btn-trash').addEventListener('click', () => {
        onDeleteRequest(cal);
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
  showToast,
  onDeleteRequest,
  onNewCalendarRequest
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
    onDeleteRequest,
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
    closeOverlay(myCalendarsOverlay);
    onNewCalendarRequest();
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
