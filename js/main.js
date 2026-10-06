/* ============================================================
   PYM_JSON - Arranque
   ============================================================ */

(function main() {
  console.log('[PYM] Arrancandoâ€¦');

  // 1) Config
  CFG.cargar();

  // 2) Plataforma (PC / MÃ³vil)
  PLATAFORMA.init();

  // 3) Reloj
  UI.iniciarReloj();

  // 4) MenÃº
  MENU.dibujar();

  // 5) Estado inicial
  UI.estado('Sistema listo. CargÃ¡ un JSON para comenzar.');

  // 6) Aviso de plataforma
  const p = CFG.get('plataforma');
  console.log('[PYM] Plataforma detectada:', p);

  console.log('[PYM] Listo.');
})();
