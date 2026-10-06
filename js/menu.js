/* ============================================================
   PYM_MENU - Dibuja y gestiona los botones del menÃº
   ============================================================ */

const MENU = (() => {

  // DefiniciÃ³n de los botones
  const BOTONES = [
    { id: 'cargar-json',   num:  1, texto: 'Cargar JSON',         siempre: true },
    { id: 'crear-db',      num:  2, texto: 'Crear DB',            requiereJSON: true, pendiente: true },
    { id: 'ver-db',        num:  3, texto: 'Ver DB',              requiereJSON: true, pendiente: true },
    { id: 'exportar',      num:  4, texto: 'Exportar',            requiereJSON: true, pendiente: true },
    { id: 'split',         num: 10, texto: 'Cortar JSON',         requiereJSON: true },
    { id: 'abrir-sqlite',  num:  5, texto: 'Abrir SQLite',        pendiente: true },
    { id: 'resumen-db',    num:  7, texto: 'Resumen DB',          pendiente: true },
    { id: 'arbol-db',      num:  8, texto: 'Ãrbol DB',            pendiente: true },
    { id: 'diagrama-er',   num:  9, texto: 'Diagrama ER',         pendiente: true },
    { id: 'csv-a-sqlite',  num: 16, texto: 'CSV â†’ SQLite',        pendiente: true },
    { id: 'explorar',      num:  6, texto: 'Explorar JSON',       requiereJSON: true, pendiente: true },
    { id: 'json-a-csv',    num: 12, texto: 'JSON â†’ CSV',          requiereJSON: true },
    { id: 'json-a-xlsx',   num: 13, texto: 'JSON â†’ XLSX',         requiereJSON: true, pendiente: true },
    { id: 'csv-a-rtf',     num: 14, texto: 'CSV â†’ RTF',           pendiente: true },
    { id: 'xlsx-a-rtf',    num: 15, texto: 'XLSX â†’ RTF',          pendiente: true }
  ];

  // Mapa id â†’ funciÃ³n ejecutar
  const ACCIONES = {
    'cargar-json':  () => ACCION_CARGAR_JSON.ejecutar(),
    'json-a-csv':   () => ACCION_JSON_A_CSV.ejecutar(),
    'split':        () => ACCION_SPLIT.ejecutar()
    // los demÃ¡s se agregan cuando se migren
  };

  function dibujar() {
    const cont = document.getElementById('pym-menu');
    cont.innerHTML = '';
    const hayJSON = ESTADO.hayJSON();

    for (const b of BOTONES) {
      const btn = document.createElement('button');
      btn.className = 'pym-btn';
      btn.dataset.accion = b.id;
      btn.innerHTML = `<span class="num">${b.num}</span>${UI.esc(b.texto)}`;

      const requiere = b.requiereJSON && !hayJSON;
      const pendiente = b.pendiente;
      btn.disabled = requiere || pendiente;
      if (pendiente) btn.title = 'PrÃ³ximamente';

      btn.addEventListener('click', async () => {
        const fn = ACCIONES[b.id];
        if (fn) {
          try { await fn(); }
          catch (e) { UI.toast('Error: ' + e.message, 'error'); console.error(e); }
        } else {
          UI.toast('MÃ³dulo no migrado todavÃ­a', 'info');
        }
      });

      cont.appendChild(btn);
    }
  }

  function refrescar() { dibujar(); }

  return { dibujar, refrescar };
})();
