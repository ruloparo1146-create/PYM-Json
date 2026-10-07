/* ============================================================
   PYM_PLATAFORMA - Detecta PC / Movil / Tablet
   Aplica el atributo data-plataforma al <body>
   ============================================================ */

const PLATAFORMA = (() => {

  function detectar() {
    const ua = navigator.userAgent || '';
    const esMovilUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua);
    const ancho = window.innerWidth;
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    if (esMovilUA) return 'movil';
    if (ancho < 720 && touch) return 'movil';
    if (ancho < 480) return 'movil';
    return 'pc';
  }

  function aplicar() {
    // Blindaje: si no hay body todavia, no hacemos nada
    if (!document.body) return null;

    const p = detectar();
    document.body.setAttribute('data-plataforma', p);

    // Guardar en config solo si CFG esta disponible
    try {
      if (typeof CFG !== 'undefined' && CFG.set) CFG.set('plataforma', p);
    } catch (e) { /* silencioso */ }

    return p;
  }

  function esMovil() {
    if (!document.body) return false;
    return document.body.getAttribute('data-plataforma') === 'movil';
  }

  function init() {
    // Si el DOM ya esta listo, aplicar ahora
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', aplicar);
    } else {
      aplicar();
    }

    // Reevaluar al rotar / redimensionar (con debounce)
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(aplicar, 200);
    });
  }

  return { init, detectar, aplicar, esMovil };
})();
