export function createDayModal({
    getActiveOverrides,
    loadOverrides,
    saveOverrides,
    calculateScheduleDate,
    getCurrentConfig,
    getIsViewOnly,
    dateKey,
    monthNames,
    markCalendarAsDirty,
    render
}) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalDate = document.getElementById('modalDate');
    const modalStatus = document.getElementById('modalStatus');
    const modalComment = document.getElementById('modalComment');
    const modalClose = document.getElementById('modalClose');
    const modalSave = document.getElementById('modalSave');
    const modalReset = document.getElementById('modalReset');

    let currentKey = null;
    let currentAutoType = null;

    function openDayModal(date) {
        const overrides = getActiveOverrides();

        currentKey = dateKey(date);
        currentAutoType = calculateScheduleDate(date, getCurrentConfig());

        const existing = overrides[currentKey];

        const dd = String(date.getDate()).padStart(2, '0');

        modalDate.textContent = `${dd} de ${monthNames[date.getMonth()]}`;
        modalStatus.value = existing ? existing.status : currentAutoType;
        modalComment.value = existing ? (existing.comment || '') : '';

        const isViewOnly = getIsViewOnly();

        modalStatus.disabled = isViewOnly;
        modalComment.disabled = isViewOnly;
        modalSave.style.display = isViewOnly ? 'none' : '';
        modalReset.style.display = isViewOnly ? 'none' : '';

        modalOverlay.classList.add('open');
    }

    function closeDayModal() {
        modalOverlay.classList.remove('open');
        currentKey = null;
    }

    function initDayModalUI() {
        modalClose.addEventListener('click', closeDayModal);

        modalOverlay.addEventListener('click', event => {
            if (event.target === modalOverlay) {
                closeDayModal();
            }
        });

        modalSave.addEventListener('click', () => {
            if (!currentKey || getIsViewOnly()) return;

            const overrides = loadOverrides();
            const status = modalStatus.value;
            const comment = modalComment.value.trim();

            const antes = overrides[currentKey]
                ? JSON.stringify(overrides[currentKey])
                : null;

            if (status === currentAutoType && comment === '') {
                delete overrides[currentKey];
            } else {
                overrides[currentKey] = { status, comment };
            }

            const depois = overrides[currentKey]
                ? JSON.stringify(overrides[currentKey])
                : null;

            const mudouDeVerdade = antes !== depois;

            saveOverrides(overrides);
            closeDayModal();
            render();

            if (mudouDeVerdade) {
                markCalendarAsDirty();
            }
        });

        modalReset.addEventListener('click', () => {
            if (!currentKey || getIsViewOnly()) return;

            const overrides = loadOverrides();
            const haviaEdicaoManual = !!overrides[currentKey];

            delete overrides[currentKey];

            saveOverrides(overrides);
            closeDayModal();
            render();

            if (haviaEdicaoManual) {
                markCalendarAsDirty();
            }
        });
    }

    return {
        initDayModalUI,
        openDayModal,
        closeDayModal
    };
}