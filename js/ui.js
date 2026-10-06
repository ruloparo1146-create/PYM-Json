/* ============================================================
   PYM_UI - Helpers de interfaz
   ============================================================ */

const UI = (() => {

  // ---- Reloj ----
  function iniciarReloj() {
    const f = document.getElementById('pym-fecha');
    const h = document.getElementById('pym-hora');
    if (!f || !h) return;

    function tick() {
      const d = new Date();
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const hh  = String(d.getHours()).padStart(2, '0');
      const mm  = String(d.getMinutes()).padStart(2, '0');
      const ss  = String(d.getSeconds()).padStart(2, '0');
      f.textContent = `${dia}/${mes}/${ano}`;
