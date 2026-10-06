/* ============================================================
   PYM_PLATAFORMA - Detecta PC / MÃ³vil / Tablet
   Y aplica el atributo data-plataforma al <body>
   ============================================================ */

const PLATAFORMA = (() => {

  function detectar() {
    const ua = navigator.userAgent || '';
    const esMovilUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua);
    const ancho = window.innerWidth;
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // Si el UA dice mÃ³vil, o la pantalla es chica y hay touch â†’ mÃ³vil
    if (esMovilUA) return 'movil';
    if (ancho < 720 && touch) return 'movil';
    if (ancho < 480) return 'movil';
    return 'pc';
  }

  function aplicar() {
    const p = detectar();
    document.body.setAttribute('data-plataforma', p);
    CFG.set('plataforma', p);
    return p;
  }

  function esMovil() {
    return document.body.getAttribute('data-plataforma') === 'movil';
  }

  function init() {
    aplicar();
    // Reevaluar al rotar / redimensionar (con debounce)
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(aplicar, 200);
    });
  }

  return { init, detectar, aplicar, esMovil };
})();
