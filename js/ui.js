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
      f.textContent = dia + '/' + mes + '/' + ano;
      h.textContent = hh + ':' + mm + ':' + ss;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---- Estado del footer ----
  function estado(msg) {
    const el = document.getElementById('pym-estado');
    if (el) el.textContent = msg;
  }

  // ---- Info del header ----
  function infoArchivo(texto) {
    const el = document.getElementById('pym-info-archivo');
    if (el) el.innerHTML = texto;
  }

  // ---- Toast ----
  function toast(msg, tipo = 'ok', ms = 3000) {
    const cont = document.getElementById('pym-toasts');
    if (!cont) { console.log('[toast]', msg); return; }
    const el = document.createElement('div');
    el.className = 'pym-toast' + (tipo === 'error' ? ' error' : tipo === 'info' ? ' info' : '');
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  // ---- Confirm ----
  function confirmar(msg) {
    return window.confirm(msg);
  }

  // ---- Escape HTML ----
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---- Descargar texto o blob ----
  function descargar(nombre, contenido, tipoMime = 'text/plain') {
    let blob;
    if (contenido instanceof Blob) {
      blob = contenido;
    } else {
      blob = new Blob([contenido], { type: tipoMime + ';charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  // ---- Pedir un archivo al usuario ----
  function pedirArchivo(accept = '.json') {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept;
      inp.onchange = () => resolve(inp.files && inp.files[0] ? inp.files[0] : null);
      inp.click();
    });
  }

  // ---- Leer archivo como texto UTF-8 ----
  function leerArchivoTexto(file) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        let texto = lector.result;
        // Quitar BOM UTF-8 si quedo
        if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);
        resolve(texto);
      };
      lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
      lector.readAsText(file, 'UTF-8');
    });
  }

  // ---- API publica ----
  return {
    iniciarReloj,
    estado,
    infoArchivo,
    toast,
    confirmar,
    esc,
    descargar,
    pedirArchivo,
    leerArchivoTexto
  };

})();
