/* ============================================================
   PYM_MENU - Dibuja y gestiona los botones del menu principal
   Estados:
     - activo: true  -> funciona, siempre habilitado
     - requiereJSON  -> se habilita solo si hay JSON cargado
     - proximamente  -> deshabilitado hasta programarlo
   ============================================================ */

const MENU = (() => {

  const BOTONES = [
    // ---- Fila 1: JSON ----
    { num:  1, id: 'cargar-json',  texto: 'Cargar JSON',
      activo: true,  requiereJSON: false },

    { num:  2, id: 'crear-db',     texto: 'Crear DB',
      activo: false, requiereJSON: true },

    { num:  3, id: 'ver-db',       texto: 'Ver DB',
      activo: false, requiereJSON: true },

    { num:  4, id: 'exportar',     texto: 'Exportar',
      activo: false, requiereJSON: true },

    { num: 10, id: 'split',        texto: 'Cortar JSON',
      activo: true,  requiereJSON: false },   // puede abrir JSON con picker

    // ---- Fila 2: DB externa y utilidades ----
    { num:  5, id: 'abrir-sqlite', texto: 'Abrir SQLite',
      activo: false, requiereJSON: false },

    { num:  7, id: 'resumen-db',   texto: 'Resumen DB',
      activo: false, requiereJSON: false },

    { num:  8, id: 'arbol-db',     texto: 'Arbol DB',
      activo: false, requiereJSON: false },

    { num:  9, id: 'diagrama-er',  texto: 'Diagrama ER',
      activo: false, requiereJSON: false },

    { num: 16, id: 'csv-a-sqlite', texto: 'CSV -> SQLite',
      activo: false, requiereJSON: false },

    // ---- Fila 3: conversiones ----
    { num:  6, id: 'explorar',     texto: 'Explorar JSON',
      activo: false, requiereJSON: false },   // puede abrir JSON con picker

    { num: 12, id: 'json-a-csv',   texto: 'JSON -> CSV',
      activo: true,  requiereJSON: false },   // puede abrir JSON con picker

    { num: 13, id: 'json-a-xlsx',  texto: 'JSON -> XLSX',
      activo: false, requiereJSON: false },

    { num: 14, id: 'csv-a-rtf',    texto: 'CSV -> RTF',
      activo: false, requiereJSON: false },

    { num: 15, id: 'xlsx-a-rtf',   texto: 'XLSX -> RTF',
      activo: false, requiereJSON: false },

    { num: 17, id: 'txt-utf8',     texto: 'TXT -> UTF-8',
      activo: false, requiereJSON: false }
  ];

  // Mapa id -> funcion. Se va llenando a medida que programamos modulos.
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

      // --- Determinar si se deshabilita ---
      let deshabilitado = false;
      let tooltip = '';

      if (!b.activo) {
        // Modulo no programado todavia
        deshabilitado = true;
        tooltip = 'Proximamente';
      } else if (b.requiereJSON && !hayJSON) {
        // Programado pero depende de tener un JSON cargado
        deshabilitado = true;
        tooltip = 'Primero carga un JSON';
      }

      btn.disabled = deshabilitado;

      // Tooltip (un poco mas informativo)
      if (deshabilitado) {
        btn.title = tooltip;
      } else {
        btn.title = 'Ejecutar: ' + b.texto;
      }

      // Click handler
      btn.addEventListener('click', async () => {
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
