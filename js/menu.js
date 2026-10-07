/* ============================================================
   PYM_MENU - Dibuja y gestiona los botones del menu principal

   Estados:
     - programado: true  -> tiene .js, funciona
     - programado: false -> sin .js todavia, muestra "en migracion"
     - requiereJSON      -> se deshabilita si no hay JSON cargado
                            (solo aplica a los programados)
   ============================================================ */

const MENU = (() => {

  const BOTONES = [
    // ---- Fila 1 ----
    { num:  1, id: 'cargar-json',  texto: 'Cargar JSON',
      programado: true,  requiereJSON: false },

    { num:  2, id: 'crear-db',     texto: 'Crear DB',
      programado: false, requiereJSON: true },   // <- usa JSON cargado

    { num:  3, id: 'ver-db',       texto: 'Ver DB',
      programado: false, requiereJSON: true },

    { num:  4, id: 'exportar',     texto: 'Exportar',
      programado: false, requiereJSON: true },

    { num: 10, id: 'split',        texto: 'Cortar JSON',
      programado: true,  requiereJSON: false },  // abre picker si no hay JSON

    // ---- Fila 2 ----
    { num:  5, id: 'abrir-sqlite', texto: 'Abrir SQLite',
      programado: false, requiereJSON: false },

    { num:  7, id: 'resumen-db',   texto: 'Resumen DB',
      programado: false, requiereJSON: false },

    { num:  8, id: 'arbol-db',     texto: 'Arbol DB',
      programado: false, requiereJSON: false },

    { num:  9, id: 'diagrama-er',  texto: 'Diagrama ER',
      programado: false, requiereJSON: false },

    { num: 16, id: 'csv-a-sqlite', texto: 'CSV -> SQLite',
      programado: false, requiereJSON: false },

    // ---- Fila 3 ----
    { num:  6, id: 'explorar',     texto: 'Explorar JSON',
      programado: false, requiereJSON: false },

    { num: 12, id: 'json-a-csv',   texto: 'JSON -> CSV',
      programado: true,  requiereJSON: false },  // abre picker si no hay JSON

    { num: 13, id: 'json-a-xlsx',  texto: 'JSON -> XLSX',
      programado: false, requiereJSON: false },

    { num: 14, id: 'csv-a-rtf',    texto: 'CSV -> RTF',
      programado: false, requiereJSON: false },

    { num: 15, id: 'xlsx-a-rtf',   texto: 'XLSX -> RTF',
      programado: false, requiereJSON: false },

    { num: 17, id: 'txt-utf8',     texto: 'TXT -> UTF-8',
      programado: false, requiereJSON: false }
  ];

  // Mapa id -> funcion. Solo los programados.
  const ACCIONES = {
    'cargar-json': () => ACCION_CARGAR_JSON.ejecutar(),
    'json-a-csv':  () => ACCION_JSON_A_CSV.ejecutar(),
    'split':       () => ACCION_SPLIT.ejecutar()
  };

  function dibujar() {
    const cont = document.getElementById('pym-menu');
    if (!cont) return;

    cont.innerHTML = '';
    const hayJSON = ESTADO.hayJSON();

    for (const b of BOTONES) {
      const btn = document.createElement('button');
      btn.className = 'pym-btn';
      btn.dataset.accion = b.id;
      btn.innerHTML =
        '<span class="num">' + b.num + '</span>' +
        UI.esc(b.texto);

      // --- Estado del boton ---
      let deshabilitado = false;
      let tooltip = '';

      if (!b.programado) {
        // Modulo aun no migrado: queda clickeable pero avisa
        // (no lo deshabilitamos para que el usuario pueda saber que existe)
        deshabilitado = false;
        tooltip = 'En migracion: proximamente disponible';
        btn.classList.add('pym-btn-pendiente');
      } else if (b.requiereJSON && !hayJSON) {
        // Programado pero necesita un JSON cargado
        deshabilitado = true;
        tooltip = 'Primero carga un JSON';
      } else {
        tooltip = 'Ejecutar: ' + b.texto;
      }

      btn.disabled = deshabilitado;
      btn.title = tooltip;

      // --- Click handler ---
      btn.addEventListener('click', async () => {
        // Si no esta programado, avisamos
        if (!b.programado) {
          UI.toast('Modulo "' + b.texto + '" en migracion. Proximamente.', 'info');
          return;
        }

        const fn = ACCIONES[b.id];
        if (typeof fn === 'function') {
          try {
            await fn();
          } catch (e) {
            console.error('[MENU] Error en ' + b.id + ':', e);
            UI.toast('Error: ' + e.message, 'error');
          }
        } else {
          UI.toast('Modulo "' + b.texto + '" todavia no esta disponible', 'info');
        }
      });

      cont.appendChild(btn);
    }
  }

  function refrescar() {
    dibujar();
  }

  return { dibujar, refrescar, BOTONES };
})();
