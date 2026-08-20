/* =========================================================
   Cronograma de Escala — módulo de cálculo + interface
   ========================================================= */

const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const weekdayLabels = ["D","S","T","Q","Q","S","S"];

const OVERRIDES_STORAGE_KEY = 'escala-overrides-2026';
const CONFIG_STORAGE_KEY = 'escala-config-v1';
const CLOUD_ID_STORAGE_KEY = 'escala-cloud-id';
const FERIAS_STORAGE_KEY = 'escala-ferias';
const THEME_STORAGE_KEY = 'escala-tema'; // preferência só do dispositivo, nunca vai pro Firebase

const DEFAULT_CONFIG = {
  nome: '',
  tipo: '12x36',            // '12x36' | '5x2' | 'personalizada'
  referenceDate: '2026-08-08',
  referenceStatus: 'folga', // 'folga' | 'trabalho'
  custom: { trabalho: 3, folga: 2 }
};

/* ---------- Utilidades de data (sem bugs de timezone) ----------
   Trabalha sempre com componentes locais (ano, mês, dia) e usa
   Date.UTC só internamente para calcular diferença de dias, o que
   evita qualquer problema de fuso horário / horário de verão. */

function parseLocalDateKey(key){
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateKey(date){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a, b){
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysBetween(dateA, dateB){
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((utcA - utcB) / 86400000);
}

/* ---------- Módulo de cálculo de escalas ----------
   Toda escala de "bloco" (N dias trabalhando / M dias de folga que
   se repetem) usa a mesma matemática de ciclo. 12x36 é o caso
   particular workDays=1 / offDays=1 (alternância diária). */

function calculateBlockCycle(date, refDate, refStatus, workDays, offDays){
  const cycleLen = workDays + offDays;
  const diff = daysBetween(date, refDate);
  const mod = ((diff % cycleLen) + cycleLen) % cycleLen;
  if(refStatus === 'trabalho'){
    return mod < workDays ? 'trabalho' : 'folga';
  }
  return mod < offDays ? 'folga' : 'trabalho';
}

function calculate12x36(date, config){
  const ref = parseLocalDateKey(config.referenceDate);
  return calculateBlockCycle(date, ref, config.referenceStatus, 1, 1);
}

function calculate5x2(date, config){
  const ref = parseLocalDateKey(config.referenceDate);
  return calculateBlockCycle(date, ref, config.referenceStatus, 5, 2);
}

function calculateCustom(date, config){
  const ref = parseLocalDateKey(config.referenceDate);
  const work = Math.max(1, parseInt(config.custom?.trabalho, 10) || 1);
  const off = Math.max(1, parseInt(config.custom?.folga, 10) || 1);
  return calculateBlockCycle(date, ref, config.referenceStatus, work, off);
}

function calculateScheduleDate(date, config){
  switch(config.tipo){
    case '5x2': return calculate5x2(date, config);
    case 'personalizada': return calculateCustom(date, config);
    case '12x36':
    default: return calculate12x36(date, config);
  }
}

/* ---------- Persistência: configuração da escala ---------- */

function loadConfig(){
  try{
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if(raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
  }catch(e){
    console.error('Erro ao ler configuração:', e);
  }
  return Object.assign({}, DEFAULT_CONFIG);
}

function saveConfig(config){
  try{
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }catch(e){
    console.error('Erro ao salvar configuração:', e);
  }
}

function hasStoredConfig(){
  return localStorage.getItem(CONFIG_STORAGE_KEY) !== null;
}

/* ---------- Persistência: edições manuais por dia (já existente) ---------- */

function loadOverrides(){
  try{
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    console.error('Erro ao ler edições:', e);
    return {};
  }
}

function saveOverrides(overrides){
  try{
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }catch(e){
    console.error('Erro ao salvar edições:', e);
  }
}

// Em modo visualização, as edições vêm do cronograma carregado (memória),
// nunca do localStorage do dispositivo.
function getActiveOverrides(){
  return isViewOnly ? viewOnlyOverrides : loadOverrides();
}

/* ---------- Persistência: férias planejadas ----------
   Cada período é um registro independente { id, dataInicio, quantidadeDias }.
   Isso NUNCA altera a escala base — é apenas consultado na hora de renderizar,
   como uma camada de sobreposição visual (ver getFeriasParaData). */

function loadFerias(){
  try{
    const raw = localStorage.getItem(FERIAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Erro ao ler férias:', e);
    return [];
  }
}

function saveFerias(lista){
  try{
    localStorage.setItem(FERIAS_STORAGE_KEY, JSON.stringify(lista));
  }catch(e){
    console.error('Erro ao salvar férias:', e);
  }
}

function getActiveFerias(){
  return isViewOnly ? viewOnlyFerias : loadFerias();
}

function gerarFeriasId(){
  return 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* Retorna o registro de férias que cobre "date", ou null.
   Não altera nem consulta a escala — pura sobreposição de datas. */
function getFeriasParaData(date, listaFerias){
  for(const f of listaFerias){
    const inicio = parseLocalDateKey(f.dataInicio);
    const dias = Math.max(1, parseInt(f.quantidadeDias, 10) || 1);
    const diff = daysBetween(date, inicio);
    if(diff >= 0 && diff < dias) return f;
  }
  return null;
}

function formatFeriasRange(f){
  const inicio = parseLocalDateKey(f.dataInicio);
  const dias = Math.max(1, parseInt(f.quantidadeDias, 10) || 1);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + dias - 1);
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  return `${fmt(inicio)} até ${fmt(fim)}`;
}

/* ---------- Persistência: ID do cronograma na nuvem ----------
   Uma vez que o usuário compartilha pela primeira vez, guardamos
   esse ID localmente. Todo salvamento seguinte atualiza o MESMO
   documento no Firestore — o link não muda depois de gerado. */

function getCloudId(){
  return localStorage.getItem(CLOUD_ID_STORAGE_KEY);
}

function setCloudId(id){
  localStorage.setItem(CLOUD_ID_STORAGE_KEY, id);
}

/* ---------- Ponte com o firebase.js ----------
   firebase.js expõe window.firebaseCronograma. Se por algum motivo
   ele não carregou (offline, erro de rede, etc.), a aplicação
   continua funcionando 100% local — só a parte "nuvem" fica indisponível. */

function cloudDisponivel(){
  return typeof window.firebaseCronograma !== 'undefined';
}

/* Envia a config + overrides atuais pro Firestore, reaproveitando o
   mesmo ID já existente. Não faz nada se o usuário ainda não tiver
   compartilhado nenhuma vez (não existe ID ainda). */
async function syncToCloud(){
  const cloudId = getCloudId();
  if(!cloudId) return; // nada compartilhado ainda, não há o que sincronizar
  if(!cloudDisponivel()){
    console.warn('Firebase indisponível — alteração ficou salva só localmente.');
    return;
  }
  try{
    await window.firebaseCronograma.salvarCronograma(
      { config: currentConfig, overrides: loadOverrides(), ferias: loadFerias() },
      cloudId
    );
    await window.firebaseCronograma.salvarIndice(cloudId, {
      nome: currentConfig.nome || '(sem nome)',
      tipo: currentConfig.tipo,
      atualizadoEm: Date.now()
    });
  }catch(e){
    console.error('Erro ao sincronizar com a nuvem:', e);
  }
}

/* SHA-256 do texto em hexadecimal — usado só pra comparar a senha do
   Gerenciador com o hash salvo no Firestore. A senha em si nunca é
   armazenada nem trafega em texto puro. */
async function sha256Hex(texto){
  const bytes = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ---------- Compartilhamento por URL (formato antigo, com parâmetros) ----------
   Mantido só para não quebrar links já compartilhados antes da versão
   com Firebase. Links novos usam ?id=XXXXXX (ver seção Firebase acima). */

function parseSharedConfigFromURL(){
  const params = new URLSearchParams(window.location.search);
  if(!params.has('escala')) return null;

  const tipo = params.get('escala');
  const cfg = {
    nome: params.get('nome') || '',
    tipo: ['12x36', '5x2', 'personalizada'].includes(tipo) ? tipo : '12x36',
    referenceDate: params.get('data') || DEFAULT_CONFIG.referenceDate,
    referenceStatus: params.get('estado') === 'trabalho' ? 'trabalho' : 'folga',
    custom: {
      trabalho: parseInt(params.get('wdias'), 10) || DEFAULT_CONFIG.custom.trabalho,
      folga: parseInt(params.get('fdias'), 10) || DEFAULT_CONFIG.custom.folga
    }
  };
  return cfg;
}

function cleanURL(){
  window.history.replaceState(null, '', window.location.pathname);
}

/* =========================================================
   Carregar um cronograma pelo ID — usado por: link compartilhado,
   "já tenho um ID" na criação, e "Visualizar" no Gerenciador.
   ========================================================= */

const viewOnlyBanner = document.getElementById('viewOnlyBanner');
const viewOnlyText = document.getElementById('viewOnlyText');
const viewOnlyCreateBtn = document.getElementById('viewOnlyCreateBtn');

function updateViewOnlyBanner(){
  if(isViewOnly){
    viewOnlyText.textContent = `Visualizando o cronograma de ${currentConfig.nome || 'alguém'} — você não é o dono`;
    viewOnlyCreateBtn.textContent = getCloudId() ? 'Voltar pro meu' : 'Criar o meu';
    viewOnlyBanner.classList.add('show');
  }else{
    viewOnlyBanner.classList.remove('show');
  }
}

viewOnlyCreateBtn.addEventListener('click', async () => {
  const meuId = getCloudId();
  if(meuId){
    await loadCronogramaById(meuId, true);
    showToast('Voltando pro seu cronograma');
  }else{
    openSettings('create');
  }
});

/**
 * Carrega um cronograma pelo ID.
 * - asOwner=true: grava local (esse ID passa a ser "o meu").
 * - asOwner=false: modo visualização, nada é gravado no dispositivo.
 */
async function loadCronogramaById(id, asOwner){
  if(!cloudDisponivel()){
    showToast('Recurso online indisponível agora');
    return false;
  }
  let cloudData = null;
  try{
    cloudData = await window.firebaseCronograma.carregarCronogramaPorId(id);
  }catch(e){
    console.error('Erro ao carregar cronograma:', e);
  }
  if(!cloudData || !cloudData.config){
    showToast('Cronograma não encontrado');
    return false;
  }

  currentConfig = cloudData.config;

  if(asOwner){
    isViewOnly = false;
    viewOnlyOverrides = {};
    viewOnlyFerias = [];
    viewOnlyId = null;
    saveConfig(currentConfig);
    if(cloudData.overrides) saveOverrides(cloudData.overrides);
    saveFerias(cloudData.ferias || []);
    setCloudId(id);
  }else{
    isViewOnly = true;
    viewOnlyId = id;
    viewOnlyOverrides = cloudData.overrides || {};
    viewOnlyFerias = cloudData.ferias || [];
  }

  updateHeader();
  updateViewOnlyBanner();
  render();
  return true;
}

/* =========================================================
   Estado da aplicação
   ========================================================= */

let currentConfig = loadConfig();
let pendingSharedConfig = null;
let pendingSharedOverrides = null;
let pendingSharedId = null;

// Modo visualização: quando o dispositivo não tem cronograma próprio e
// abre o link de outra pessoa. Não grava nada local nesse modo.
let isViewOnly = false;
let viewOnlyOverrides = {};
let viewOnlyFerias = [];
let viewOnlyId = null;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const REAL_CURRENT_YEAR = today.getFullYear();
let displayYear = REAL_CURRENT_YEAR;
const container = document.getElementById('calendar');

const menu = document.querySelector('.menu_superior');
const calendar = document.querySelector('#calendar');
const viewOnlyBannerEl = document.getElementById('viewOnlyBanner');

if (menu && calendar) {
    function ajustarCalendar() {
        const alturaMenu = menu.getBoundingClientRect().height;
        if (viewOnlyBannerEl) viewOnlyBannerEl.style.marginTop = `${alturaMenu}px`;
        const bannerVisivel = viewOnlyBannerEl && viewOnlyBannerEl.classList.contains('show');
        calendar.style.marginTop = bannerVisivel ? '16px' : `${alturaMenu - 10}px`;
    }

    const observer = new ResizeObserver(ajustarCalendar);
    observer.observe(menu);
    if (viewOnlyBannerEl) observer.observe(viewOnlyBannerEl);
    ajustarCalendar();
}

/* =========================================================
   Tema (Escuro/Claro) — preferência puramente visual do
   dispositivo. NÃO faz parte de currentConfig, não é
   sincronizada com o Firebase, não afeta escala/férias/edições.
   Preparado pra futuros temas: basta criar theme-X.css e
   adicionar uma <option> no #cfgTema.
   ========================================================= */

function loadTheme(){
  return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
}

function applyTheme(tema){
  const link = document.getElementById('themeStylesheet');
  if(link) link.setAttribute('href', `theme-${tema}.css`);
  localStorage.setItem(THEME_STORAGE_KEY, tema);
}

const cfgTemaSelect = document.getElementById('cfgTema');
if(cfgTemaSelect){
  cfgTemaSelect.addEventListener('change', () => applyTheme(cfgTemaSelect.value));
}

/* =========================================================
   Toast
   ========================================================= */

function showToast(message){
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* =========================================================
   Cabeçalho (nome / tipo de escala)
   ========================================================= */

function updateHeader(){
  const h1 = document.querySelector('header h1');
  h1.textContent = currentConfig.nome ? currentConfig.nome : 'Cronograma de Escala';

  const eyebrow = document.querySelector('.eyebrow');
  const labels = { '12x36': 'Escala 12x36', '5x2': 'Escala 5x2', 'personalizada': 'Escala personalizada' };
  eyebrow.textContent = labels[currentConfig.tipo] || 'Escala';

  document.getElementById('yearBtn').textContent = displayYear;
}

/* =========================================================
   Menu de três pontos
   ========================================================= */

const menuBtn = document.getElementById('menuBtn');
const menuDropdown = document.getElementById('menuDropdown');

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  menuDropdown.classList.remove('open');
});

menuDropdown.querySelectorAll('button[data-action]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.remove('open');
    const action = btn.dataset.action;

    if(isViewOnly && (action === 'config' || action === 'ferias')){
      showToast('Você está só visualizando — crie o seu próprio cronograma primeiro');
      return;
    }

    if(action === 'config') openSettings('edit');
    if(action === 'ferias') openManagerFeriasModal();
    if(action === 'mine') openMineModal();
    if(action === 'manager') openManagerPassword();
    if(action === 'about') aboutOverlay.classList.add('open');
  });
});

/* =========================================================
   Seletor de ano
   ========================================================= */

const yearBtn = document.getElementById('yearBtn');
const yearDropdown = document.getElementById('yearDropdown');
const yearList = document.getElementById('yearList');
const yearInput = document.getElementById('yearInput');
const yearGo = document.getElementById('yearGo');
const yearToday = document.getElementById('yearToday');

function buildYearList(){
  yearList.innerHTML = '';
  for(let y = REAL_CURRENT_YEAR - 5; y <= REAL_CURRENT_YEAR + 5; y++){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = y;
    if(y === displayYear) btn.classList.add('selected');
    btn.addEventListener('click', () => setDisplayYear(y));
    yearList.appendChild(btn);
  }
}

function setDisplayYear(year){
  if(!year || isNaN(year)) return;
  displayYear = year;
  yearBtn.textContent = displayYear;
  yearDropdown.classList.remove('open');
  render();
}

yearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  yearInput.value = displayYear;
  buildYearList();
  yearDropdown.classList.toggle('open');
});

yearDropdown.addEventListener('click', (e) => e.stopPropagation());

document.addEventListener('click', () => {
  yearDropdown.classList.remove('open');
});

yearGo.addEventListener('click', () => setDisplayYear(parseInt(yearInput.value, 10)));
yearInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') setDisplayYear(parseInt(yearInput.value, 10));
});
yearToday.addEventListener('click', () => setDisplayYear(REAL_CURRENT_YEAR));

/* =========================================================
   Botão flutuante: voltar pro dia atual
   ========================================================= */

const backToTodayBtn = document.getElementById('backToTodayBtn');
let todayObserver = null;

function setupBackToTodayWatcher(){
  if(todayObserver) todayObserver.disconnect();

  if(displayYear !== REAL_CURRENT_YEAR){
    backToTodayBtn.classList.add('show');
    return;
  }

  const elementoHoje = document.querySelector('.day.today');
  if(!elementoHoje){
    backToTodayBtn.classList.remove('show');
    return;
  }

  todayObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      backToTodayBtn.classList.toggle('show', !entry.isIntersecting);
    });
  }, { threshold: 0.4 });

  todayObserver.observe(elementoHoje);
}

backToTodayBtn.addEventListener('click', () => {
  if(displayYear !== REAL_CURRENT_YEAR){
    setDisplayYear(REAL_CURRENT_YEAR);
    requestAnimationFrame(() => {
      const el = document.querySelector('.day.today');
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return;
  }
  const el = document.querySelector('.day.today');
  if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* =========================================================
   Modal: edição de dia (status manual + comentário)
   ========================================================= */

const modalOverlay = document.getElementById('modalOverlay');
const modalDate = document.getElementById('modalDate');
const modalStatus = document.getElementById('modalStatus');
const modalComment = document.getElementById('modalComment');
const modalClose = document.getElementById('modalClose');
const modalSave = document.getElementById('modalSave');
const modalReset = document.getElementById('modalReset');

let currentKey = null;
let currentAutoType = null;

function openDayModal(date){
  const overrides = getActiveOverrides();
  currentKey = dateKey(date);
  currentAutoType = calculateScheduleDate(date, currentConfig);
  const existing = overrides[currentKey];

  const dd = String(date.getDate()).padStart(2, '0');
  modalDate.textContent = `${dd} de ${monthNames[date.getMonth()]}`;
  modalStatus.value = existing ? existing.status : currentAutoType;
  modalComment.value = existing ? (existing.comment || '') : '';
  modalStatus.disabled = isViewOnly;
  modalComment.disabled = isViewOnly;
  modalSave.style.display = isViewOnly ? 'none' : '';
  modalReset.style.display = isViewOnly ? 'none' : '';

  modalOverlay.classList.add('open');
}

function closeDayModal(){
  modalOverlay.classList.remove('open');
  currentKey = null;
}

modalClose.addEventListener('click', closeDayModal);
modalOverlay.addEventListener('click', (e) => { if(e.target === modalOverlay) closeDayModal(); });

modalSave.addEventListener('click', () => {
  if(!currentKey || isViewOnly) return;
  const overrides = loadOverrides();
  const status = modalStatus.value;
  const comment = modalComment.value.trim();

  if(status === currentAutoType && comment === ''){
    delete overrides[currentKey];
  }else{
    overrides[currentKey] = { status, comment };
  }
  saveOverrides(overrides);
  closeDayModal();
  render();
  syncToCloud();
});

modalReset.addEventListener('click', () => {
  if(!currentKey || isViewOnly) return;
  const overrides = loadOverrides();
  delete overrides[currentKey];
  saveOverrides(overrides);
  closeDayModal();
  render();
  syncToCloud();
});

/* =========================================================
   Modal: Configurações
   ========================================================= */

const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const settingsCancel = document.getElementById('settingsCancel');
const settingsSave = document.getElementById('settingsSave');

const cfgNome = document.getElementById('cfgNome');
const cfgTipo = document.getElementById('cfgTipo');
const cfgCustomGroup = document.getElementById('cfgCustomGroup');
const cfgCustomWork = document.getElementById('cfgCustomWork');
const cfgCustomOff = document.getElementById('cfgCustomOff');
const cfgRefDate = document.getElementById('cfgRefDate');
const settingsLoadExisting = document.getElementById('settingsLoadExisting');
const settingsTitle = document.querySelector('#settingsOverlay h2');

let settingsMode = 'edit'; // 'edit' | 'create'

function updateSettingsVisibility(){
  const tipo = cfgTipo.value;
  cfgCustomGroup.classList.toggle('show', tipo === 'personalizada');
}

function fillSettingsForm(config){
  cfgNome.value = config.nome || '';
  cfgTipo.value = config.tipo;
  cfgCustomWork.value = config.custom?.trabalho ?? 3;
  cfgCustomOff.value = config.custom?.folga ?? 2;
  cfgRefDate.value = config.referenceDate;
  const radio = document.querySelector(`input[name="cfgRefStatus"][value="${config.referenceStatus}"]`);
  if(radio) radio.checked = true;
  updateSettingsVisibility();
}

function openSettings(mode){
  settingsMode = mode || 'edit';
  if(cfgTemaSelect) cfgTemaSelect.value = loadTheme();
  if(settingsMode === 'create'){
    settingsTitle.textContent = 'Configure seu cronograma';
    settingsSave.textContent = 'Criar meu cronograma';
    settingsLoadExisting.style.display = '';
    fillSettingsForm(DEFAULT_CONFIG);
  }else{
    settingsTitle.textContent = 'Configurações';
    settingsSave.textContent = 'Salvar';
    settingsLoadExisting.style.display = 'none';
    fillSettingsForm(currentConfig);
  }
  settingsOverlay.classList.add('open');
}

function closeSettings(){
  settingsOverlay.classList.remove('open');
}

settingsLoadExisting.addEventListener('click', async () => {
  const id = window.prompt('Cole aqui o ID do cronograma que você recebeu:');
  if(!id) return;
  const ok = await loadCronogramaById(id.trim().toUpperCase(), true);
  if(ok){
    closeSettings();
    showToast('Cronograma carregado!');
  }
});

cfgTipo.addEventListener('change', updateSettingsVisibility);
settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => { if(e.target === settingsOverlay) closeSettings(); });

settingsSave.addEventListener('click', async () => {
  const refStatusInput = document.querySelector('input[name="cfgRefStatus"]:checked');
  if(!cfgRefDate.value){
    showToast('Defina uma data de referência');
    return;
  }
  const newConfig = {
    nome: cfgNome.value.trim(),
    tipo: cfgTipo.value,
    referenceDate: cfgRefDate.value,
    referenceStatus: refStatusInput ? refStatusInput.value : 'folga',
    custom: {
      trabalho: Math.max(1, parseInt(cfgCustomWork.value, 10) || 1),
      folga: Math.max(1, parseInt(cfgCustomOff.value, 10) || 1)
    }
  };

  if(settingsMode === 'create'){
    if(!cloudDisponivel()){
      showToast('Recurso online indisponível — não é possível criar agora');
      return;
    }
    showToast('Criando cronograma...');
    try{
      const novoId = await window.firebaseCronograma.salvarCronograma(
        { config: newConfig, overrides: {}, ferias: [] }
        // sem 2º argumento: firebase.js gera um ID novo
      );
      setCloudId(novoId);
      currentConfig = newConfig;
      isViewOnly = false;
      saveConfig(currentConfig);
      saveOverrides({});
      saveFerias([]);
      await window.firebaseCronograma.salvarIndice(novoId, {
        nome: currentConfig.nome || '(sem nome)',
        tipo: currentConfig.tipo,
        atualizadoEm: Date.now()
      });
      updateHeader();
      updateViewOnlyBanner();
      closeSettings();
      render();
      showToast('Cronograma criado!');
    }catch(e){
      console.error('Erro ao criar cronograma:', e);
      showToast('Erro ao criar cronograma');
    }
    return;
  }

  currentConfig = newConfig;
  saveConfig(currentConfig);
  updateHeader();
  closeSettings();
  render();
  showToast('Configurações salvas!');
  syncToCloud();
});

/* =========================================================
   Compartilhar escala (Firestore — mesmo ID sempre)
   ========================================================= */

async function shareSchedule(){
  if(!cloudDisponivel()){
    showToast('Recurso online indisponível agora');
    return;
  }

  showToast('Gerando link...');
  try{
    const cloudId = await window.firebaseCronograma.salvarCronograma(
      { config: currentConfig, overrides: loadOverrides(), ferias: loadFerias() },
      getCloudId() // reaproveita o ID se já existir; se não, o firebase.js gera um novo
    );
    setCloudId(cloudId);

    const url = `${window.location.origin}${window.location.pathname}?id=${cloudId}`;
    try{
      await navigator.clipboard.writeText(url);
      showToast('Link copiado!');
    }catch(e){
      window.prompt('Copie o link da sua escala:', url);
    }
  }catch(e){
    console.error('Erro ao gerar link de compartilhamento:', e);
    showToast('Erro ao gerar link');
  }
}

/* =========================================================
   Conflito: cronograma local existente vs link compartilhado
   ========================================================= */

const conflictOverlay = document.getElementById('conflictOverlay');
const conflictKeep = document.getElementById('conflictKeep');
const conflictLoad = document.getElementById('conflictLoad');

conflictKeep.addEventListener('click', () => {
  conflictOverlay.classList.remove('open');
  pendingSharedConfig = null;
  pendingSharedOverrides = null;
  pendingSharedId = null;
  cleanURL();
});

conflictLoad.addEventListener('click', async () => {
  const idParaCarregar = pendingSharedId;
  conflictOverlay.classList.remove('open');
  pendingSharedConfig = null;
  pendingSharedOverrides = null;
  pendingSharedId = null;
  cleanURL();

  if(idParaCarregar){
    // Carrega em modo VISUALIZAÇÃO — o cronograma próprio deste dispositivo
    // continua guardado, só não é o que está sendo mostrado agora.
    const ok = await loadCronogramaById(idParaCarregar, false);
    if(ok) showToast('Visualizando cronograma compartilhado');
  }
});

/* =========================================================
   Sobre
   ========================================================= */

const aboutOverlay = document.getElementById('aboutOverlay');
const aboutClose = document.getElementById('aboutClose');
aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('open'));
aboutOverlay.addEventListener('click', (e) => { if(e.target === aboutOverlay) aboutOverlay.classList.remove('open'); });

/* =========================================================
   Férias planejadas
   ========================================================= */

const feriasOverlay = document.getElementById('feriasOverlay');
const feriasClose = document.getElementById('feriasClose');
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

let feriasEditandoId = null; // null = criando nova; id = editando existente

function renderFeriasList(){
  const lista = loadFerias();
  if(!lista.length){
    feriasListContent.innerHTML = '<p class="manager-empty">Nenhuma férias planejada ainda.</p>';
    return;
  }
  // ordena por data de início
  const ordenada = [...lista].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  feriasListContent.innerHTML = '';
  ordenada.forEach(f => {
    const row = document.createElement('div');
    row.className = 'manager-item';
    row.innerHTML = `
      <div class="manager-item-info">
        <span class="manager-item-name">${formatFeriasRange(f)}</span>
        <span class="manager-item-meta">${f.quantidadeDias} dias</span>
      </div>
      <div class="manager-item-actions">
        <button type="button" data-edit>Editar</button>
        <button type="button" class="danger" data-delete>Excluir</button>
      </div>
    `;
    row.querySelector('[data-edit]').addEventListener('click', () => openFeriasForm(f));
    row.querySelector('[data-delete]').addEventListener('click', () => excluirFerias(f.id));
    feriasListContent.appendChild(row);
  });
}

function showFeriasList(){
  feriasTitle.textContent = 'Férias planejadas';
  feriasListView.style.display = '';
  feriasFormView.classList.remove('show');
  renderFeriasList();
}

function openFeriasForm(feriasExistente){
  feriasEditandoId = feriasExistente ? feriasExistente.id : null;
  feriasTitle.textContent = feriasExistente ? 'Editar férias' : 'Nova férias';
  feriasDataInicio.value = feriasExistente ? feriasExistente.dataInicio : '';
  feriasQuantidade.value = feriasExistente ? feriasExistente.quantidadeDias : 15;
  feriasListView.style.display = 'none';
  feriasFormView.classList.add('show');
  updateFeriasPreview();
}

function updateFeriasPreview(){
  if(!feriasDataInicio.value){
    feriasPreview.textContent = '';
    return;
  }
  const dias = Math.max(1, parseInt(feriasQuantidade.value, 10) || 1);
  feriasPreview.textContent = formatFeriasRange({ dataInicio: feriasDataInicio.value, quantidadeDias: dias });
}
feriasDataInicio.addEventListener('input', updateFeriasPreview);
feriasQuantidade.addEventListener('input', updateFeriasPreview);

function openManagerFeriasModal(){
  feriasEditandoId = null;
  showFeriasList();
  feriasOverlay.classList.add('open');
}

feriasClose.addEventListener('click', () => feriasOverlay.classList.remove('open'));
feriasOverlay.addEventListener('click', (e) => { if(e.target === feriasOverlay) feriasOverlay.classList.remove('open'); });

feriasNewBtn.addEventListener('click', () => openFeriasForm(null));
feriasFormCancel.addEventListener('click', showFeriasList);

feriasFormSave.addEventListener('click', () => {
  if(!feriasDataInicio.value){
    showToast('Defina a data de início');
    return;
  }
  const dias = Math.max(1, parseInt(feriasQuantidade.value, 10) || 1);
  const lista = loadFerias();

  if(feriasEditandoId){
    const idx = lista.findIndex(f => f.id === feriasEditandoId);
    if(idx !== -1){
      lista[idx] = { ...lista[idx], dataInicio: feriasDataInicio.value, quantidadeDias: dias };
    }
  }else{
    lista.push({ id: gerarFeriasId(), dataInicio: feriasDataInicio.value, quantidadeDias: dias });
  }

  saveFerias(lista);
  showFeriasList();
  render();
  showToast('Férias salvas!');
  syncToCloud();
});

function excluirFerias(id){
  const lista = loadFerias().filter(f => f.id !== id);
  saveFerias(lista);
  renderFeriasList();
  render();
  showToast('Férias excluídas');
  syncToCloud();
}

/* =========================================================
   Meu cronograma (ID + copiar + compartilhar)
   ========================================================= */

const mineOverlay = document.getElementById('mineOverlay');
const mineClose = document.getElementById('mineClose');
const mineId = document.getElementById('mineId');
const mineCopy = document.getElementById('mineCopy');
const mineShare = document.getElementById('mineShare');

function openMineModal(){
  const id = getCloudId();
  mineId.textContent = id || 'Ainda não compartilhado';
  mineOverlay.classList.add('open');
}

mineClose.addEventListener('click', () => mineOverlay.classList.remove('open'));
mineOverlay.addEventListener('click', (e) => { if(e.target === mineOverlay) mineOverlay.classList.remove('open'); });

mineCopy.addEventListener('click', async () => {
  const id = getCloudId();
  if(!id){
    showToast('Compartilhe primeiro pra gerar um ID');
    return;
  }
  try{
    await navigator.clipboard.writeText(id);
    showToast('ID copiado!');
  }catch(e){
    window.prompt('Copie o ID:', id);
  }
});

mineShare.addEventListener('click', () => {
  if(isViewOnly){
    showToast('Você está só visualizando — volte pro seu cronograma antes de compartilhar');
    return;
  }
  mineOverlay.classList.remove('open');
  shareSchedule();
});

/* =========================================================
   Gerenciador de Cronogramas (protegido por senha)
   ========================================================= */

const managerPasswordOverlay = document.getElementById('managerPasswordOverlay');
const managerPasswordClose = document.getElementById('managerPasswordClose');
const managerPasswordCancel = document.getElementById('managerPasswordCancel');
const managerPasswordSubmit = document.getElementById('managerPasswordSubmit');
const managerPasswordInput = document.getElementById('managerPasswordInput');

const managerListOverlay = document.getElementById('managerListOverlay');
const managerListClose = document.getElementById('managerListClose');
const managerListContent = document.getElementById('managerListContent');

function openManagerPassword(){
  managerPasswordInput.value = '';
  managerPasswordOverlay.classList.add('open');
}

function closeManagerPassword(){
  managerPasswordOverlay.classList.remove('open');
}

managerPasswordClose.addEventListener('click', closeManagerPassword);
managerPasswordCancel.addEventListener('click', closeManagerPassword);
managerPasswordOverlay.addEventListener('click', (e) => { if(e.target === managerPasswordOverlay) closeManagerPassword(); });

managerPasswordSubmit.addEventListener('click', async () => {
  const senha = managerPasswordInput.value;
  if(!senha){
    showToast('Digite a senha');
    return;
  }
  if(!cloudDisponivel()){
    showToast('Recurso online indisponível agora');
    return;
  }
  try{
    const hashCorreto = await window.firebaseCronograma.buscarHashSenhaGerenciador();
    if(!hashCorreto){
      showToast('Gerenciador ainda não configurado');
      return;
    }
    const hashDigitado = await sha256Hex(senha);
    if(hashDigitado !== hashCorreto){
      showToast('Senha incorreta');
      return;
    }
    closeManagerPassword();
    await openManagerList();
  }catch(e){
    console.error('Erro ao validar senha do Gerenciador:', e);
    showToast('Erro ao validar senha');
  }
});

async function openManagerList(){
  managerListContent.innerHTML = '<p class="manager-empty">Carregando...</p>';
  managerListOverlay.classList.add('open');
  try{
    const lista = await window.firebaseCronograma.listarIndice();
    if(!lista.length){
      managerListContent.innerHTML = '<p class="manager-empty">Nenhum cronograma encontrado.</p>';
      return;
    }
    lista.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
    managerListContent.innerHTML = '';
    lista.forEach(item => {
      const row = document.createElement('div');
      row.className = 'manager-item';
      row.innerHTML = `
        <div class="manager-item-info">
          <span class="manager-item-name">${item.nome || '(sem nome)'}</span>
          <span class="manager-item-meta">${item.tipo || '--'} · ${item.id}</span>
        </div>
        <button type="button">Visualizar</button>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        managerListOverlay.classList.remove('open');
        await loadCronogramaById(item.id, false);
      });
      managerListContent.appendChild(row);
    });
  }catch(e){
    console.error('Erro ao listar cronogramas:', e);
    managerListContent.innerHTML = '<p class="manager-empty">Erro ao carregar a lista.</p>';
  }
}

managerListClose.addEventListener('click', () => managerListOverlay.classList.remove('open'));
managerListOverlay.addEventListener('click', (e) => { if(e.target === managerListOverlay) managerListOverlay.classList.remove('open'); });

/* =========================================================
   Render do calendário
   ========================================================= */

function render(){
  container.innerHTML = '';
  const overrides = getActiveOverrides();
  const feriasList = getActiveFerias();

  for(let monthIdx = 0; monthIdx < 12; monthIdx++){
    const year = displayYear;
    const first = new Date(year, monthIdx, 1);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const startWeekday = first.getDay();

    let folgaCount = 0, trabalhoCount = 0, feriasCount = 0;
    const cells = [];

    for(let i = 0; i < startWeekday; i++){
      cells.push('<div class="day empty"></div>');
    }
    for(let d = 1; d <= daysInMonth; d++){
      const date = new Date(year, monthIdx, d);
      const key = dateKey(date);

      // 1) escala base  2) edição manual  3) férias (só visual, nunca escreve por cima)
      const autoType = calculateScheduleDate(date, currentConfig);
      const override = overrides[key];
      const status = override ? override.status : autoType; // escala real do dia (sobrevive à remoção de férias)
      const comment = override ? (override.comment || '') : '';
      const isManual = !!override;

      const feriasDoDia = getFeriasParaData(date, feriasList);
      const displayType = feriasDoDia ? 'ferias' : status;

      const isToday = isSameDay(date, today);
      const isPast = date < today && !isToday;

      // displayType é o estado final do dia — mesma fonte usada na renderização,
      // agora também usada na contagem, pra folga+trabalho+férias nunca passar
      // do total de dias do mês.
      if(displayType === 'ferias') feriasCount++;
      else if(displayType === 'folga') folgaCount++;
      else if(displayType === 'trabalho') trabalhoCount++;

      const cls = `${displayType}${isPast ? ' past' : ''}${isToday ? ' today' : ''}${isManual ? ' manual' : ''}`;
      const pin = comment ? '<span class="pin">📌</span>' : '';
      const title = comment ? ` title="${comment.replace(/"/g, '&quot;')}"` : '';
      cells.push(`<div class="day ${cls}" data-date="${key}"${title}>${d}${pin}</div>`);
    }

    const monthEl = document.createElement('div');
    monthEl.className = 'month';
    const feriasLabel = feriasCount ? ` · ${feriasCount} férias` : '';
    monthEl.innerHTML = `
      <div class="month-title">
        <span>${monthNames[monthIdx]} ${year}</span>
        <span class="month-count">${folgaCount} folgas · ${trabalhoCount} trab.${feriasLabel}</span>
      </div>
      <div class="weekdays">${weekdayLabels.map(w => `<div>${w}</div>`).join('')}</div>
      <div class="grid">${cells.join('')}</div>
    `;
    container.appendChild(monthEl);
  }

  // clique nos dias (delegado no container, funciona pra todos os meses)
  container.querySelectorAll('.day:not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      const [y, m, d] = el.dataset.date.split('-').map(Number);
      openDayModal(new Date(y, m - 1, d));
    });
  });

  setupBackToTodayWatcher();
}

/* =========================================================
   Inicialização
   ========================================================= */

async function init(){
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  const myCloudId = getCloudId();

  if(urlId){
    if(urlId === myCloudId){
      // Caso B: é o meu próprio link — recarrega/sincroniza como dono
      await loadCronogramaById(urlId, true);
    }else if(myCloudId){
      // Caso C: já tenho outro cronograma — não sobrescreve sem perguntar
      if(cloudDisponivel()){
        showToast('Carregando cronograma compartilhado...');
        try{
          const cloudData = await window.firebaseCronograma.carregarCronogramaPorId(urlId);
          if(cloudData && cloudData.config){
            pendingSharedConfig = cloudData.config;
            pendingSharedOverrides = cloudData.overrides || {};
            pendingSharedId = urlId;
            conflictOverlay.classList.add('open');
          }else{
            showToast('Cronograma não encontrado');
          }
        }catch(e){
          console.error('Erro ao carregar cronograma compartilhado:', e);
        }
      }
    }else{
      // Caso A: não tenho cronograma nenhum ainda — abre em modo visualização,
      // NÃO vira meu automaticamente (essa é a regra principal desta versão)
      await loadCronogramaById(urlId, false);
    }
    cleanURL();
  }else if(myCloudId || hasStoredConfig()){
    // Já tenho cronograma local — comportamento normal
    currentConfig = loadConfig();
  }else{
    // Caso D: nada de nada — tela de criação
    updateHeader();
    render();
    openSettings('create');
    return;
  }

  updateHeader();
  updateViewOnlyBanner();
  render();

  const elementoHoje = document.querySelector('.day.today');
  if(elementoHoje){
    elementoHoje.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
}

init();