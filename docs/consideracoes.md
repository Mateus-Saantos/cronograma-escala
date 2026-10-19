cronograma-escala/
├── index.html
├── README.md
├── docs/consideracoes.md
├── assets/img/
├── css/
│   ├── base.css                 (style.css atual)
│   └── themes/dark.css, light.css
└── js/
    ├── main.js                  (só init: hoje app.js)
    ├── config/
    │   ├── constants.js
    │   └── firebase-config.js
    ├── core/
    │   ├── dates.js             (helpers de data que hoje estão em schedule.js)
    │   ├── schedule.js
    │   └── vacations.js
    ├── state/
    │   ├── state.js
    │   └── events.js
    ├── services/
    │   ├── firebase.js          (exporta funções, sem window)
    │   ├── storage.js
    │   ├── calendars-registry.js (hoje calendars.js)
    │   └── sync.js              (só dados: dirty e synced state)
    ├── features/
    │   ├── calendar/    render.js, year-selector.js, day-modal.js
    │   ├── vacations/   vacations-modal.js
    │   ├── calendars/   my-calendars-modal.js, calendar-actions.js
    │   ├── settings/    settings-modal.js
    │   ├── share/       share-modal.js, conflict-modal.js
    │   ├── sync/        save-button.js
    │   └── shell/       menu.js, theme.js, layout.js, about-modal.js, view-only-banner.js
    └── utils/
        ├── dom.js               (toast e abrir/fechar overlay)
        └── favicon.js

>> ATENÇÃO
  • Os comentários dos dias são inseridos no atributo HTML title, com as aspas duplas escapadas. Como esse conteúdo vem do usuário, vale revisar a forma de construir esse atributo e testar comentários com caracteres especiais. Não alterei isso nesta etapa, pois nosso objetivo agora é preservar o comportamento

  • Em manager.js, dados vindos da nuvem (item.nome, item.tipo e item.id) são inseridos diretamente em innerHTML. Se esses valores contiverem HTML malicioso, existe risco de injeção de conteúdo.