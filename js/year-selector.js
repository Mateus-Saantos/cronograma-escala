export function createYearSelector({
    REAL_CURRENT_YEAR,
    getDisplayYear,
    setDisplayYearState,
    render
}) {
    const yearBtn = document.getElementById('yearBtn');
    const yearDropdown = document.getElementById('yearDropdown');
    const yearList = document.getElementById('yearList');
    const yearInput = document.getElementById('yearInput');
    const yearGo = document.getElementById('yearGo');
    const yearToday = document.getElementById('yearToday');

    const backToTodayBtn = document.getElementById('backToTodayBtn');

    let todayObserver = null;

    function buildYearList() {
        yearList.innerHTML = '';

        for (
            let y = REAL_CURRENT_YEAR - 5;
            y <= REAL_CURRENT_YEAR + 5;
            y++
        ) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = y;

            if (y === getDisplayYear()) {
                btn.classList.add('selected');
            }

            btn.addEventListener('click', () => setDisplayYear(y));
            yearList.appendChild(btn);
        }
    }

    function setDisplayYear(year) {
        if (!year || isNaN(year)) return;

        setDisplayYearState(year);
        yearBtn.textContent = year;
        yearDropdown.classList.remove('open');
        render();
    }

    function setupBackToTodayWatcher() {
        if (todayObserver) {
            todayObserver.disconnect();
        }

        if (getDisplayYear() !== REAL_CURRENT_YEAR) {
            backToTodayBtn.classList.add('show');
            return;
        }

        const elementoHoje = document.querySelector('.day.today');

        if (!elementoHoje) {
            backToTodayBtn.classList.remove('show');
            return;
        }

        todayObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                backToTodayBtn.classList.toggle(
                    'show',
                    !entry.isIntersecting
                );
            });
        }, { threshold: 0.4 });

        todayObserver.observe(elementoHoje);
    }

    function initYearSelectorUI() {
        yearBtn.addEventListener('click', event => {
            event.stopPropagation();
            yearInput.value = getDisplayYear();
            buildYearList();
            yearDropdown.classList.toggle('open');
        });

        yearDropdown.addEventListener('click', event => {
            event.stopPropagation();
        });

        document.addEventListener('click', () => {
            yearDropdown.classList.remove('open');
        });

        yearGo.addEventListener('click', () => {
            setDisplayYear(parseInt(yearInput.value, 10));
        });

        yearInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                setDisplayYear(parseInt(yearInput.value, 10));
            }
        });

        yearToday.addEventListener('click', () => {
            setDisplayYear(REAL_CURRENT_YEAR);
        });

        backToTodayBtn.addEventListener('click', () => {
            if (getDisplayYear() !== REAL_CURRENT_YEAR) {
                setDisplayYear(REAL_CURRENT_YEAR);

                requestAnimationFrame(() => {
                    const el = document.querySelector('.day.today');
                    if (el) {
                        el.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                });

                return;
            }

            const el = document.querySelector('.day.today');

            if (el) {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    }

    return {
        initYearSelectorUI,
        buildYearList,
        setDisplayYear,
        setupBackToTodayWatcher
    };
}