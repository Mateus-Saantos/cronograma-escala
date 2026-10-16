/* =========================================================
   ui.js
   Responsabilidade:
   - Renderizar os 12 meses do calendário.
   - Calcular as contagens de folgas, trabalho e férias.
   - Conectar os dias renderizados ao modal de edição.
   ========================================================= */

export function createCalendarUI({
  container,
  getActiveOverrides,
  getActiveFerias,
  calculateScheduleDate,
  getCurrentConfig,
  getDisplayYear,
  today,
  isSameDay,
  dateKey,
  getFeriasParaData,
  monthNames,
  weekdayLabels,
  openDayModal,
  setupBackToTodayWatcher
}) {
  function render() {
    container.innerHTML = '';

    const overrides = getActiveOverrides();
    const feriasList = getActiveFerias();

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const year = getDisplayYear();
      const first = new Date(year, monthIdx, 1);
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const startWeekday = first.getDay();

      let folgaCount = 0, trabalhoCount = 0, feriasCount = 0;
      const cells = [];

      for (let i = 0; i < startWeekday; i++) {
        cells.push('<div class="day empty"></div>');
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, monthIdx, d);
        const key = dateKey(date);

        // 1) escala base  2) edição manual  3) férias (só visual, nunca escreve por cima)
        const autoType = calculateScheduleDate(date, getCurrentConfig());
        const override = overrides[key];
        const status = override ? override.status : autoType;
        const comment = override ? (override.comment || '') : '';
        const isManual = !!override;

        const feriasDoDia = getFeriasParaData(date, feriasList);
        const displayType = feriasDoDia ? 'ferias' : status;

        const isToday = isSameDay(date, today);
        const isPast = date < today && !isToday;

        // displayType é o estado final do dia — mesma fonte usada na renderização,
        // agora também usada na contagem, pra folga+trabalho+férias nunca passar
        // do total de dias do mês.
        if (displayType === 'ferias') feriasCount++;
        else if (displayType === 'folga') folgaCount++;
        else if (displayType === 'trabalho') trabalhoCount++;

        const cls = `${displayType}${isPast ? ' past' : ''}${isToday ? ' today' : ''}${isManual ? ' manual' : ''}`;
        const pin = comment ? '<span class="pin">📌</span>' : '';
        const title = comment ? ` title="${comment.replace(/"/g, '&quot;')}"` : '';

        cells.push(
          `<div class="day ${cls}" data-date="${key}"${title}>${d}${pin}</div>`
        );
      }

      const monthEl = document.createElement('div');
      monthEl.className = 'month';

      const feriasLabel = feriasCount ? ` · ${feriasCount} férias` : '';

      monthEl.innerHTML = `
        <div class="month-bar"></div>
        <div class="month-title">
          <span>${monthNames[monthIdx]} ${year}</span>
          <span class="month-count">${folgaCount} folgas · ${trabalhoCount} trab.${feriasLabel}</span>
        </div>

        <div class="weekdays">
          ${weekdayLabels.map(w => `<div>${w}</div>`).join('')}
        </div>

        <div class="grid">${cells.join('')}</div>
      `;


      container.appendChild(monthEl);
    }

    // Clique nos dias (delegado no container, funciona pra todos os meses).
    container.querySelectorAll('.day:not(.empty)').forEach(el => {
      el.addEventListener('click', () => {
        const [y, m, d] = el.dataset.date.split('-').map(Number);
        openDayModal(new Date(y, m - 1, d));
      });
    });

    setupBackToTodayWatcher();
  }

  return { render };
}
