import {
  openOverlay,
  closeOverlay
} from './utils/dom.js';

export function createSettingsModule({
    DEFAULT_CONFIG,
    cfgTemaSelect,
    loadTheme,
    getCurrentConfig,
    setCurrentConfig,
    setViewOnly,
    saveConfig,
    saveOverrides,
    saveFerias,
    getActiveCalendarId,
    registrarCalendario,
    saveSyncedState,
    clearCalendarDirty,
    markCalendarAsDirty,
    updateHeader,
    updateViewOnlyBanner,
    render,
    cloudDisponivel,
    setCloudId,
    showToast,
    getMyCalendars,
    switchToCalendar,
    loadCronogramaById,
    criarNovoCalendarioLocal
}) {
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

    let settingsMode = 'edit';

    function updateSettingsVisibility() {
        const tipo = cfgTipo.value;
        cfgCustomGroup.classList.toggle(
            'show',
            tipo === 'personalizada'
        );
    }

    function fillSettingsForm(config) {
        cfgNome.value = config.nome || '';
        cfgTipo.value = config.tipo;
        cfgCustomWork.value = config.custom?.trabalho ?? 3;
        cfgCustomOff.value = config.custom?.folga ?? 2;
        cfgRefDate.value = config.referenceDate;

        const radio = document.querySelector(
            `input[name="cfgRefStatus"][value="${config.referenceStatus}"]`
        );
        if (radio) radio.checked = true;
        updateSettingsVisibility();
    }

    function openSettings(mode) {
        settingsMode = mode || 'edit';
        if (cfgTemaSelect) {
            cfgTemaSelect.value = loadTheme();
        }
        if (settingsMode === 'create') {
            settingsTitle.textContent = 'Configure seu cronograma';
            settingsSave.textContent = 'Criar meu cronograma';
            settingsLoadExisting.style.display = '';
            fillSettingsForm(DEFAULT_CONFIG);
        } else {
            settingsTitle.textContent = 'Configurações';
            settingsSave.textContent = 'Salvar';
            settingsLoadExisting.style.display = 'none';
            fillSettingsForm(getCurrentConfig());
        }
        openOverlay(settingsOverlay);
    }
    function closeSettings() {
        closeOverlay(settingsOverlay);
    }

    /* ============================================================
     * Fluxo único para carregar um calendário existente pelo ID.
     =========================================================== */
    async function carregarCalendarioPorPrompt() {
        const idDigitado = window.prompt(
            'Cole aqui o ID do calendário que você recebeu:'
        );
        if (!idDigitado) return false;
        const id = idDigitado.trim().toUpperCase();
        const existente = getMyCalendars().find(
            calendario => calendario.cloudId === id
        );
        if (existente) {
            const abrir = window.confirm(
                'Este calendário já está neste dispositivo.\n\nDeseja abri-lo agora?'
            );
            if (abrir) {
                switchToCalendar(existente.localId);
                showToast(
                    `Calendário aberto: ${existente.name || 'sem nome'}`
                );
                return true;
            }
            return false;
        }
        const ok = await loadCronogramaById(id, true);
        if (ok) {
            showToast('Calendário carregado!');
        }
        return ok;
    }

    function initSettingsUI() {
        settingsLoadExisting.addEventListener('click', async () => {
            const ok = await carregarCalendarioPorPrompt();

            if (ok) closeSettings();
        });

        cfgTipo.addEventListener(
            'change',
            updateSettingsVisibility
        );

        settingsClose.addEventListener('click', closeSettings);
        settingsCancel.addEventListener('click', closeSettings);

        settingsOverlay.addEventListener('click', event => {
            if (event.target === settingsOverlay) {
                closeSettings();
            }
        });

        settingsSave.addEventListener('click', async () => {
            const refStatusInput = document.querySelector(
                'input[name="cfgRefStatus"]:checked'
            );

            if (!cfgRefDate.value) {
                showToast('Defina uma data de referência');
                return;
            }

            const newConfig = {
                nome: cfgNome.value.trim(),
                tipo: cfgTipo.value,
                referenceDate: cfgRefDate.value,
                referenceStatus: refStatusInput
                    ? refStatusInput.value
                    : 'folga',
                custom: {
                    trabalho: Math.max(
                        1,
                        parseInt(cfgCustomWork.value, 10) || 1
                    ),
                    folga: Math.max(
                        1,
                        parseInt(cfgCustomOff.value, 10) || 1
                    )
                }
            };

                        if (settingsMode === 'create') {
                if (!newConfig.nome) {
                    showToast('Dê um nome pro calendário');
                    return;
                }

                settingsSave.disabled = true;
                showToast('Criando calendário...');

                try {
                    const ok = await criarNovoCalendarioLocal(
                        newConfig.nome,
                        newConfig.tipo,
                        newConfig
                    );

                    if (ok) {
                        closeSettings();
                        showToast('Calendário criado!');
                    }
                } finally {
                    settingsSave.disabled = false;
                }

                return;
            }

            const configAnterior = JSON.stringify(getCurrentConfig());

            setCurrentConfig(newConfig);
            saveConfig(newConfig);

            if (
                JSON.stringify(getCurrentConfig()) !== configAnterior
            ) {
                markCalendarAsDirty();
            }

            // Mantém o tipo do calendário atualizado sem renomeá-lo.
            const activeIdEdicao = getActiveCalendarId();

            if (activeIdEdicao) {
                registrarCalendario(activeIdEdicao, {
                    type: newConfig.tipo
                });
            }

            updateHeader();
            closeSettings();
            render();
            showToast('Configurações salvas!');
        });
    }

    return {
        initSettingsUI,
        openSettings,
        closeSettings,
        updateSettingsVisibility,
        fillSettingsForm,
        carregarCalendarioPorPrompt
    };
}