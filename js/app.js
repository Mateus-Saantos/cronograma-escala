/*
 * app.js — ponto de integração dos módulos do Cronograma de Escala.
 * Mantém o script.js original intacto; este arquivo só será usado quando
 * a página for conectada a ele na etapa de integração.
 */

import {
  parseLocalDateKey, dateKey, isSameDay, daysBetween,
  calculateScheduleDate
} from './schedule.js';
import {
  loadConfig, saveConfig, hasStoredConfig,
  loadOverrides, saveOverrides, getActiveOverrides,
  loadFerias, saveFerias, getActiveFerias
} from './services/storage.js';
import {
  gerarCalendarioId, calendarStorageKey, getMyCalendars,
  registrarCalendario, getActiveCalendarId, migrarParaMeusCalendarios
} from './calendars.js';
import { state } from './state.js';
import { createSyncModule } from './services/sync.js';
import { createCalendarUI } from './ui.js';
import { createDayModal } from './day-modal.js';
import { createYearSelector } from './year-selector.js';
import { createSettingsModule } from './settings.js';
import { initCalendarsUI } from './calendars-ui.js';
import { atualizarFaviconDoDia } from './utils/favicon.js';
import { gerarFeriasId, getFeriasParaData, formatFeriasRange } from './vacations.js';
import { salvarIndice, carregarCronogramaPorId, salvarCronograma } from './services/firebase.js';

atualizarFaviconDoDia();
// Verifica se mudou o dia enquanto a página está aberta.
setInterval(atualizarFaviconDoDia, 60_000);

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const OVERRIDES_STORAGE_KEY = 'escala-overrides-2026';
const CONFIG_STORAGE_KEY = 'escala-config-v1';
const CLOUD_ID_STORAGE_KEY = 'escala-cloud-id';
const FERIAS_STORAGE_KEY = 'escala-ferias';
const DIRTY_STORAGE_KEY = 'escala-dirty';
const SYNCED_STATE_STORAGE_KEY = 'escala-synced-state';
const THEME_STORAGE_KEY = 'escala-tema';
const MY_CALENDARS_STORAGE_KEY = 'escala-meus-calendarios';
const ACTIVE_CALENDAR_STORAGE_KEY = 'escala-calendario-ativo';

const DEFAULT_CONFIG = {
  nome: '',
  tipo: '12x36',
  referenceDate: '2026-08-08',
  referenceStatus: 'folga',
  custom: { trabalho: 3, folga: 2 }
};

const storageDependencies = {
  calendarStorageKey,
  getActiveCalendarId: activeCalendarId,
  CONFIG_STORAGE_KEY,
  OVERRIDES_STORAGE_KEY,
  FERIAS_STORAGE_KEY,
  CLOUD_ID_STORAGE_KEY,
  DEFAULT_CONFIG
};
const calendarDependencies = {
  MY_CALENDARS_STORAGE_KEY,
  ACTIVE_CALENDAR_STORAGE_KEY
};

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function loadTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
}
function applyTheme(theme) {
  const link = document.getElementById('themeStylesheet');
  if (link) link.setAttribute('href', `theme-${theme}.css`);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
const cfgTemaSelect = document.getElementById('cfgTema');
if (cfgTemaSelect) {
  cfgTemaSelect.addEventListener('change', () => applyTheme(cfgTemaSelect.value));
}

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const REAL_CURRENT_YEAR = today.getFullYear();
let displayYear = REAL_CURRENT_YEAR;
const container = document.getElementById('calendar');

function getCurrentConfig() {
  return state.currentConfig || DEFAULT_CONFIG;
}
function setCurrentConfig(config) {
  state.currentConfig = config;
}
function setViewOnly(value) {
  state.isViewOnly = value;
}
function activeOverrides() {
  return getActiveOverrides({
    ...storageDependencies,
    isViewOnly: state.isViewOnly,
    viewOnlyOverrides: state.viewOnlyOverrides
  });
}
function activeFerias() {
  return getActiveFerias({
    ...storageDependencies,
    isViewOnly: state.isViewOnly,
    viewOnlyFerias: state.viewOnlyFerias
  });
}
function readConfig() {
  return loadConfig(storageDependencies);
}
function writeConfig(config) {
  saveConfig(config, storageDependencies);
}
function readOverrides() {
  return loadOverrides(storageDependencies);
}
function writeOverrides(overrides) {
  saveOverrides(overrides, storageDependencies);
}
function readFerias() {
  return loadFerias(storageDependencies);
}
function writeFerias(ferias) {
  saveFerias(ferias, storageDependencies);
}
function storedConfigExists() {
  return hasStoredConfig(storageDependencies);
}
function myCalendars() {
  return getMyCalendars(calendarDependencies);
}
function registerCalendar(localId, data) {
  registrarCalendario(localId, data, calendarDependencies);
}
function activeCalendarId() {
  return getActiveCalendarId({ ACTIVE_CALENDAR_STORAGE_KEY });
}

const sync = createSyncModule({
  getActiveCalendarId: activeCalendarId,
  calendarStorageKey,
  DIRTY_STORAGE_KEY,
  SYNCED_STATE_STORAGE_KEY,
  CLOUD_ID_STORAGE_KEY,
  loadConfig: readConfig,
  loadOverrides: readOverrides,
  loadFerias: readFerias,
  registrarCalendario: registerCalendar,
  showToast
});
const {
  hasUnsavedChanges, markCalendarAsDirty, clearCalendarDirty,
  updateDirtyIndicator, saveSyncedState, getCloudId, setCloudId,
  cloudDisponivel, initSyncUI
} = sync;

function updateHeader() {
  const h1 = document.querySelector('header h1');
  if (h1) h1.textContent = getCurrentConfig().nome || 'Cronograma de Escala';
  const eyebrow = document.querySelector('.eyebrow');
  const labels = {
    '12x36': 'Escala 12x36',
    '5x2': 'Escala 5x2',
    personalizada: 'Escala personalizada'
  };
  if (eyebrow) eyebrow.textContent = labels[getCurrentConfig().tipo] || 'Escala';
  const yearBtn = document.getElementById('yearBtn');
  if (yearBtn) yearBtn.textContent = displayYear;
  updateDirtyIndicator();
  sync.updateSaveButton('idle');
}

function updateViewOnlyBanner() {
  const banner = document.getElementById('viewOnlyBanner');
  const text = document.getElementById('viewOnlyText');
  const button = document.getElementById('viewOnlyCreateBtn');
  if (!banner || !text || !button) return;
  if (state.isViewOnly) {
    text.textContent = `Visualizando o cronograma de ${getCurrentConfig().nome || 'alguém'} — você não é o dono`;
    button.textContent = getCloudId() ? 'Voltar pro meu' : 'Criar o meu';
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}

function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', bytes).then(hashBuffer =>
    Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  );
}

function updateActiveCalendarRecord(localId, config) {
  if (localId) registerCalendar(localId, {
    name: config.nome || '',
    type: config.tipo
  });
}

function getCurrentCalendar() {
  return {
    id: activeCalendarId(),
    localId: activeCalendarId(),
    cloudId: getCloudId(),
    name: getCurrentConfig().nome || '',
    type: getCurrentConfig().tipo,
    config: getCurrentConfig(),
    overrides: activeOverrides(),
    ferias: activeFerias(),
    isViewOnly: state.isViewOnly
  };
}
window.getCurrentCalendar = getCurrentCalendar;

let render = () => { };
let yearSelector;
const dayModal = createDayModal({
  getActiveOverrides: activeOverrides,
  loadOverrides: readOverrides,
  saveOverrides: writeOverrides,
  calculateScheduleDate,
  getCurrentConfig,
  getIsViewOnly: () => state.isViewOnly,
  dateKey,
  monthNames,
  markCalendarAsDirty,
  render: () => render()
});
yearSelector = createYearSelector({
  REAL_CURRENT_YEAR,
  getDisplayYear: () => displayYear,
  setDisplayYearState: year => { displayYear = year; },
  render: () => render()
});
const calendarUI = createCalendarUI({
  container,
  getActiveOverrides: activeOverrides,
  getActiveFerias: activeFerias,
  calculateScheduleDate,
  getCurrentConfig,
  getDisplayYear: () => displayYear,
  today,
  isSameDay,
  dateKey,
  getFeriasParaData: (date, list) => getFeriasParaData(date, list, {
    parseLocalDateKey,
    daysBetween
  }),
  monthNames,
  weekdayLabels,
  openDayModal: dayModal.openDayModal,
  setupBackToTodayWatcher: () => yearSelector.setupBackToTodayWatcher()
});
render = calendarUI.render;

function cleanURL() {
  window.history.replaceState(null, '', window.location.pathname);
}

async function loadCronogramaById(id, asOwner) {
  if (!cloudDisponivel()) {
    showToast('Recurso online indisponível agora');
    return false;
  }
  let cloudData = null;
  try {
    cloudData = await carregarCronogramaPorId(id);
  } catch (error) {
    console.error('Erro ao carregar cronograma:', error);
  }
  if (!cloudData || !cloudData.config) {
    showToast('Calendário não encontrado. Verifique o ID e tente novamente.');
    return false;
  }

  setCurrentConfig(cloudData.config);
  if (asOwner) {
    setViewOnly(false);
    state.viewOnlyOverrides = {};
    state.viewOnlyFerias = [];
    state.viewOnlyId = null;

    const existing = myCalendars().find(calendar => calendar.cloudId === id);
    const activeIsEmpty = !getCloudId() && !storedConfigExists();
    let localId;
    if (existing) localId = existing.localId;
    else if (activeIsEmpty) localId = activeCalendarId();
    else localId = gerarCalendarioId();

    localStorage.setItem(ACTIVE_CALENDAR_STORAGE_KEY, localId);
    writeConfig(getCurrentConfig());
    writeOverrides(cloudData.overrides || {});
    writeFerias(cloudData.ferias || []);
    setCloudId(id);
    registerCalendar(localId, {
      name: getCurrentConfig().nome || '',
      type: getCurrentConfig().tipo,
      cloudId: id
    });
    saveSyncedState({
      config: getCurrentConfig(),
      overrides: cloudData.overrides || {},
      ferias: cloudData.ferias || []
    });
    clearCalendarDirty();
  } else {
    setViewOnly(true);
    state.viewOnlyId = id;
    state.viewOnlyOverrides = cloudData.overrides || {};
    state.viewOnlyFerias = cloudData.ferias || [];
  }
  updateHeader();
  updateViewOnlyBanner();
  render();
  return true;
}

function switchToCalendar(localId) {
  if (!localId) return;
  if (localId === activeCalendarId() && !state.isViewOnly) return;
  localStorage.setItem(ACTIVE_CALENDAR_STORAGE_KEY, localId);
  setViewOnly(false);
  state.viewOnlyOverrides = {};
  state.viewOnlyFerias = [];
  state.viewOnlyId = null;
  setCurrentConfig(readConfig());
  updateHeader();
  updateViewOnlyBanner();
  render();
}
window.switchToCalendar = switchToCalendar;

async function criarNovoCalendarioLocal(nome, tipo) {
  if (!cloudDisponivel()) {
    showToast('Sem conexão com o servidor — não é possível criar um calendário agora');
    return false;
  }
  const config = Object.assign({}, DEFAULT_CONFIG, { tipo });
  let cloudId = null;
  try {
    cloudId = await salvarCronograma({
      config, overrides: {}, ferias: []
    });
  } catch (error) {
    console.error('Erro ao criar calendário no Firebase:', error);
    showToast('Não foi possível criar o calendário agora. Tente novamente.');
    return false;
  }
  if (!cloudId) {
    console.error('salvarCronograma() não retornou um cloudId válido ao criar calendário.');
    showToast('Não foi possível criar o calendário agora. Tente novamente.');
    return false;
  }

  const localId = gerarCalendarioId();
  registerCalendar(localId, { name: nome, type: tipo, cloudId });
  localStorage.setItem(ACTIVE_CALENDAR_STORAGE_KEY, localId);
  writeConfig(config);
  writeOverrides({});
  writeFerias([]);
  setCloudId(cloudId);
  saveSyncedState({ config, overrides: {}, ferias: [] });
  clearCalendarDirty();

  try {
    await salvarIndice(cloudId, {
      nome, tipo, atualizadoEm: Date.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar índice do novo calendário:', error);
  }

  setViewOnly(false);
  state.viewOnlyOverrides = {};
  state.viewOnlyFerias = [];
  state.viewOnlyId = null;
  setCurrentConfig(config);
  updateHeader();
  updateViewOnlyBanner();
  render();
  return true;
}

const settings = createSettingsModule({
  DEFAULT_CONFIG,
  cfgTemaSelect,
  loadTheme,
  getCurrentConfig,
  setCurrentConfig,
  setViewOnly,
  saveConfig: writeConfig,
  saveOverrides: writeOverrides,
  saveFerias: writeFerias,
  getActiveCalendarId: activeCalendarId,
  registrarCalendario: registerCalendar,
  saveSyncedState,
  clearCalendarDirty,
  markCalendarAsDirty,
  updateHeader,
  updateViewOnlyBanner,
  render: () => render(),
  cloudDisponivel,
  setCloudId,
  showToast,
  getMyCalendars: myCalendars,
  switchToCalendar,
  loadCronogramaById
});

function initCalendarsModule() {
  const elements = {
    myCalendarsOverlay: document.getElementById('myCalendarsOverlay'),
    myCalendarsClose: document.getElementById('myCalendarsClose'),
    myCalendarsListContent: document.getElementById('myCalendarsListContent'),
    myCalendarsNewBtn: document.getElementById('myCalendarsNewBtn'),
    myCalendarsLoadBtn: document.getElementById('myCalendarsLoadBtn'),
    newCalendarOverlay: document.getElementById('newCalendarOverlay'),
    newCalendarClose: document.getElementById('newCalendarClose'),
    newCalendarName: document.getElementById('newCalendarName'),
    newCalendarType: document.getElementById('newCalendarType'),
    newCalendarCancel: document.getElementById('newCalendarCancel'),
    newCalendarCreate: document.getElementById('newCalendarCreate')
  };
  return initCalendarsUI({
    elements,
    getMyCalendars: myCalendars,
    getActiveCalendarId: activeCalendarId,
    switchToCalendar,
    carregarCalendarioPorPrompt: settings.carregarCalendarioPorPrompt,
    criarNovoCalendarioLocal,
    showToast
  });
}
const calendarsUI = initCalendarsModule();

function updateCalendarLayout() {
  const menu = document.querySelector('.menu_superior');
  const calendar = document.querySelector('#calendar');
  const banner = document.getElementById('viewOnlyBanner');
  if (!menu || !calendar) return;
  function adjust() {
    const menuHeight = menu.getBoundingClientRect().height;
    if (banner) banner.style.marginTop = `${menuHeight}px`;
    const bannerVisible = banner && banner.classList.contains('show');
    calendar.style.marginTop = bannerVisible ? '16px' : `${menuHeight - 10}px`;
  }
  const observer = new ResizeObserver(adjust);
  observer.observe(menu);
  if (banner) observer.observe(banner);
  adjust();
}

/* Menu principal */
const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');
menuBtn?.addEventListener('click', event => {
  event.stopPropagation();
  menuDropdown.classList.toggle('open');
});
document.addEventListener('click', () => menuDropdown?.classList.remove('open'));
menuDropdown?.querySelectorAll('button[data-action]').forEach(button => {
  button.addEventListener('click', event => {
    event.stopPropagation();
    menuDropdown.classList.remove('open');
    const action = button.dataset.action;
    if (state.isViewOnly && (action === 'config' || action === 'ferias')) {
      showToast('Você está só visualizando — crie o seu próprio cronograma primeiro');
      return;
    }
    if (action === 'config') settings.openSettings('edit');
    if (action === 'ferias') openManagerFeriasModal();
    if (action === 'mine') openMineModal();
    if (action === 'calendars') calendarsUI.openMyCalendarsModal();
    if (action === 'about') document.getElementById('aboutOverlay').classList.add('open');
  });
});

/* Modal de edição diária */
dayModal.initDayModalUI();
yearSelector.initYearSelectorUI();
settings.initSettingsUI();
initSyncUI();

const viewOnlyCreateBtn = document.getElementById('viewOnlyCreateBtn');
viewOnlyCreateBtn?.addEventListener('click', async () => {
  const myId = getCloudId();
  if (myId) {
    await loadCronogramaById(myId, true);
    showToast('Voltando pro seu cronograma');
  } else {
    switchToCalendar(activeCalendarId());
    showToast('Voltando pro seu calendário');
  }
});

/* Conflito ao abrir um link compartilhado com outro calendário local. */
const conflictOverlay = document.getElementById('conflictOverlay');
let pendingSharedId = null;
document.getElementById('conflictKeep')?.addEventListener('click', () => {
  conflictOverlay.classList.remove('open');
  pendingSharedId = null;
  cleanURL();
});
document.getElementById('conflictLoad')?.addEventListener('click', async () => {
  const id = pendingSharedId;
  conflictOverlay.classList.remove('open');
  pendingSharedId = null;
  cleanURL();
  if (id && await loadCronogramaById(id, false)) {
    showToast('Visualizando cronograma compartilhado');
  }
});

/* Sobre */
const aboutOverlay = document.getElementById('aboutOverlay');
document.getElementById('aboutClose')?.addEventListener('click', () => aboutOverlay.classList.remove('open'));
aboutOverlay?.addEventListener('click', event => {
  if (event.target === aboutOverlay) aboutOverlay.classList.remove('open');
});

/* Férias planejadas — a interface esta aqui; helpers ficam em vacations.js. */
const feriasOverlay = document.getElementById('feriasOverlay');
const feriasTitle = document.getElementById('feriasTitle');
const feriasListView = document.getElementById('feriasListView');
const feriasListContent = document.getElementById('feriasListContent');
const feriasNewBtn = document.getElementById('feriasNewBtn');
const feriasFormView = document.getElementById('feriasFormView');
const feriasDataInicio = document.getElementById('feriasDataInicio');
const feriasQuantidade = document.getElementById('feriasQuantidade');
const feriasPreview = document.getElementById('feriasPreview');
const feriasFormCancel = document.getElementById('feriasFormCancel');
const feriasFormSave = document.getElementById('feriasFormSave');
let feriasEditandoId = null;

function renderFeriasList() {
  const list = readFerias();
  if (!list.length) {
    feriasListContent.innerHTML = '<p class="manager-empty">Nenhuma férias planejada ainda.</p>';
    return;
  }
  const ordered = [...list].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  feriasListContent.innerHTML = '';
  ordered.forEach(item => {
    const row = document.createElement('div');
    row.className = 'manager-item';
    row.innerHTML = `
      <div class="manager-item-info">
        <span class="manager-item-name">${formatFeriasRange(item, { parseLocalDateKey })}</span>
        <span class="manager-item-meta">${item.quantidadeDias} dias</span>
      </div>
      <div class="manager-item-actions">
        <button type="button" data-edit>Editar</button>
        <button type="button" class="danger" data-delete>Excluir</button>
      </div>`;
    row.querySelector('[data-edit]').addEventListener('click', () => openFeriasForm(item));
    row.querySelector('[data-delete]').addEventListener('click', () => excluirFerias(item.id));
    feriasListContent.appendChild(row);
  });
}
function showFeriasList() {
  feriasTitle.textContent = 'Férias planejadas';
  feriasListView.style.display = '';
  feriasFormView.classList.remove('show');
  renderFeriasList();
}
function openFeriasForm(existing) {
  feriasEditandoId = existing ? existing.id : null;
  feriasTitle.textContent = existing ? 'Editar férias' : 'Nova férias';
  feriasDataInicio.value = existing ? existing.dataInicio : '';
  feriasQuantidade.value = existing ? existing.quantidadeDias : 15;
  feriasListView.style.display = 'none';
  feriasFormView.classList.add('show');
  updateFeriasPreview();
}
function updateFeriasPreview() {
  if (!feriasDataInicio.value) {
    feriasPreview.textContent = '';
    return;
  }
  const days = Math.max(1, parseInt(feriasQuantidade.value, 10) || 1);
  feriasPreview.textContent = formatFeriasRange(
    { dataInicio: feriasDataInicio.value, quantidadeDias: days },
    { parseLocalDateKey }
  );
}
function openManagerFeriasModal() {
  feriasEditandoId = null;
  showFeriasList();
  feriasOverlay.classList.add('open');
}
function excluirFerias(id) {
  const before = readFerias();
  const after = before.filter(item => item.id !== id);
  const changed = after.length !== before.length;
  writeFerias(after);
  renderFeriasList();
  render();
  if (changed) markCalendarAsDirty();
  showToast('Férias excluídas');
}
feriasDataInicio.addEventListener('input', updateFeriasPreview);
feriasQuantidade.addEventListener('input', updateFeriasPreview);
document.getElementById('feriasClose').addEventListener('click', () => feriasOverlay.classList.remove('open'));
feriasOverlay.addEventListener('click', event => {
  if (event.target === feriasOverlay) feriasOverlay.classList.remove('open');
});
feriasNewBtn.addEventListener('click', () => openFeriasForm(null));
feriasFormCancel.addEventListener('click', showFeriasList);
feriasFormSave.addEventListener('click', () => {
  if (!feriasDataInicio.value) {
    showToast('Defina a data de início');
    return;
  }
  const days = Math.max(1, parseInt(feriasQuantidade.value, 10) || 1);
  const list = readFerias();
  const before = JSON.stringify(list);
  if (feriasEditandoId) {
    const index = list.findIndex(item => item.id === feriasEditandoId);
    if (index !== -1) list[index] = {
      ...list[index], dataInicio: feriasDataInicio.value, quantidadeDias: days
    };
  } else {
    list.push({ id: gerarFeriasId(), dataInicio: feriasDataInicio.value, quantidadeDias: days });
  }
  const changed = JSON.stringify(list) !== before;
  writeFerias(list);
  showFeriasList();
  render();
  if (changed) markCalendarAsDirty();
  showToast('Férias salvas!');
});

/* Meu ID e compartilhamento */
const mineOverlay = document.getElementById('mineOverlay');
const mineId = document.getElementById('mineId');
const mineCalendarsHint = document.getElementById('mineCalendarsHint');
function openMineModal() {
  mineId.textContent = getCloudId() || 'Ainda não compartilhado';
  if (mineCalendarsHint) {
    const total = myCalendars().length;
    mineCalendarsHint.textContent = total > 1
      ? `Você tem ${total} calendários salvos neste dispositivo.`
      : 'Você tem 1 calendário salvo neste dispositivo.';
  }
  mineOverlay.classList.add('open');
}
document.getElementById('mineClose').addEventListener('click', () => mineOverlay.classList.remove('open'));
mineOverlay.addEventListener('click', event => {
  if (event.target === mineOverlay) mineOverlay.classList.remove('open');
});
document.getElementById('mineCopy').addEventListener('click', async () => {
  const id = getCloudId();
  if (!id) {
    showToast('Compartilhe primeiro pra gerar um ID');
    return;
  }
  try {
    await navigator.clipboard.writeText(id);
    showToast('ID copiado!');
  } catch {
    window.prompt('Copie o ID:', id);
  }
});
async function shareSchedule() {
  if (!cloudDisponivel()) {
    showToast('Recurso online indisponível agora');
    return;
  }
  showToast('Gerando link...');
  try {
    const data = { config: getCurrentConfig(), overrides: readOverrides(), ferias: readFerias() };
    const cloudId = await salvarCronograma(data, getCloudId());
    setCloudId(cloudId);
    saveSyncedState(data);
    clearCalendarDirty();
    const url = `${window.location.origin}${window.location.pathname}?id=${cloudId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado!');
    } catch {
      window.prompt('Copie o link da sua escala:', url);
    }
  } catch (error) {
    console.error('Erro ao gerar link de compartilhamento:', error);
    showToast('Erro ao gerar link');
  }
}
document.getElementById('mineShare').addEventListener('click', () => {
  if (state.isViewOnly) {
    showToast('Você está só visualizando — volte pro seu calendário antes de compartilhar');
    return;
  }
  mineOverlay.classList.remove('open');
  shareSchedule();
});

/* Tema/layout e inicialização */
function initTheme() {
  if (cfgTemaSelect) cfgTemaSelect.value = loadTheme();
  const menu = document.querySelector('.menu_superior');
  const calendar = document.querySelector('#calendar');
  const banner = document.getElementById('viewOnlyBanner');
  if (!menu || !calendar) return;
  function adjust() {
    const height = menu.getBoundingClientRect().height;
    if (banner) banner.style.marginTop = `${height}px`;
    calendar.style.marginTop = banner && banner.classList.contains('show')
      ? '16px' : `${height - 10}px`;
  }
  const observer = new ResizeObserver(adjust);
  observer.observe(menu);
  if (banner) observer.observe(banner);
  adjust();
}

async function init() {
  migrarParaMeusCalendarios({
    ...calendarDependencies,
    CONFIG_STORAGE_KEY,
    OVERRIDES_STORAGE_KEY,
    FERIAS_STORAGE_KEY,
    CLOUD_ID_STORAGE_KEY
  });
  setCurrentConfig(readConfig());
  initTheme();
  updateCalendarLayout();

  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  const myCloudId = getCloudId();

  if (urlId) {
    if (urlId === myCloudId) {
      await loadCronogramaById(urlId, true);
    } else if (myCloudId) {
      if (cloudDisponivel()) {
        showToast('Carregando cronograma compartilhado...');
        try {
          const cloudData = await carregarCronogramaPorId(urlId);
          if (cloudData && cloudData.config) {
            state.pendingSharedConfig = cloudData.config;
            state.pendingSharedOverrides = cloudData.overrides || {};
            state.pendingSharedId = urlId;
            pendingSharedId = urlId;
            conflictOverlay.classList.add('open');
          } else {
            showToast('Cronograma não encontrado');
          }
        } catch (error) {
          console.error('Erro ao carregar cronograma compartilhado:', error);
        }
      }
    } else {
      await loadCronogramaById(urlId, false);
    }
    cleanURL();
  } else if (myCloudId || storedConfigExists()) {
    setCurrentConfig(readConfig());
  } else {
    updateHeader();
    render();
    settings.openSettings('create');
    return;
  }

  updateHeader();
  updateViewOnlyBanner();
  render();
  const todayElement = document.querySelector('.day.today');
  if (todayElement) todayElement.scrollIntoView({ behavior: 'instant', block: 'center' });
}
init();


// criar um /js/favicon.js colcoar export nesse aqui e dar um import aqui no app.js

