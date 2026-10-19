
export function atualizarFaviconDoDia() {
    // Obtém o dia atual
    const dia = new Date().getDate();

    // Centraliza o dia no favicon
    const centroX = 48 * 0.5;
    const centroY = 48 * 0.5 + 15;

    // Desenho do favicon com o dia atual
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="160">

<!-- Fundo do calendário -->
        <rect x="1" y="4"
        width="46"
        height="43"
        rx="7"
        fill="#eee"/>

<!-- Barra do topo do calendário -->
        <path d="M 8 4 H 40 Q 47 4 47 11 V 15 H 1 V 11 Q 1 4 8 4 Z" fill="#55bbff"/>

<!-- Furo do arame superior -->
        <path d="M10 8 V8  M37 8 V8"
            stroke="#0067ac"
            stroke-width="6"
            stroke-linecap="round"/>

<!-- Arame superior -->
        <path d="M10 3 V8  M37 3 V8"
            stroke="#eee"
            stroke-width="4"
            stroke-linecap="round"/>

<!-- Número do dia -->
        <text x="${centroX}" y="${centroY}"
            font-family="Arial, sans-serif"
            font-size="${dia >= 10 ? 28 : 28}"
            font-weight="bold"
            text-anchor="middle"
            fill="#0099ff">${dia}</text>
    </svg>
    `;

  let favicon = document.querySelector('link[rel~="icon"]');

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.type = 'image/svg+xml';
  favicon.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

