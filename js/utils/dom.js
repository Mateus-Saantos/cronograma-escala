/*=======================================================
js/utils/dom.js

Responsabilidade:
- Exibir notificações toast
- Abrir e fechar overlays
=======================================================*/

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(showToast._t);

  showToast._t = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

export function openOverlay(overlay) {
  const element = typeof overlay === 'string'
    ? document.getElementById(overlay)
    : overlay;

  element?.classList.add('open');
}

export function closeOverlay(overlay) {
  const element = typeof overlay === 'string'
    ? document.getElementById(overlay)
    : overlay;

  element?.classList.remove('open');
}
