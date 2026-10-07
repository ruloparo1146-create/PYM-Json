/* ============================================================
   PYM_MENU - Dibuja y gestiona los botones del menu principal
   Todos los botones visibles; los no programados van disabled.
   ============================================================ */

const MENU = (() => {

  // ---- Definicion de los botones ----
  // num        : numero del boton (para mostrar en el circulito)
  // id         : identificador de la accion (coincide con el nombre del archivo en js/acciones/)
  // texto      : texto visible
  // requiereJSON : si esta deshabilitado hasta que se cargue un JSON
  // activo     : si ya esta programado (si no, queda disabled con tooltip "Proximamente")
  const BOTONES = [
    // ---- Fila 1: JSON ----
    { num:  1, id: 'cargar-json',  texto: 'Cargar JSON',      activo: true,  requiereJSON: false },
    { num:  2, id: 'crear-db',     texto: 'Crear DB',         activo: false, requiereJSON: true  },
    { num:  3, id: 'ver-db',       texto: 'Ver DB',           activo: false, requiereJSON: true  },
    { num:  4, id: 'exportar',     texto: 'Exportar',         activo: false, requiereJSON: true  },
    { num: 10, id: 'split',        texto: 'Cortar JSON',      activo: true,  requiereJSON: true  },

    // ---- Fila 2: DB externa y utilidades ----
    { num:  5, id: 'abrir-sqlite', texto: 'Abrir SQLite',     activo: false, requiereJSON: false },
    { num:  7, id: 'resumen-db',   texto: 'Resumen DB',       activo: false, requiereJSON: false },
    { num:  8, id: 'arbol-db',     texto: 'Arbol DB',         activo: false, requiereJSON: false },
    { num:  9, id: 'diagrama-er',  texto: 'Diagrama ER',      activo: false, requiereJSON: false },
    { num: 16, id: 'csv-a-sqlite', texto: 'CSV -> SQLite',    activo: false, requiereJSON: false },

    // ---- Fila 3: conversiones ----
    { num:  6, id: 'explorar',     texto: 'Explorar JSON',    activo: false, requiereJSON: true  },
    { num: 12, id: 'json-a-csv',   texto: 'JSON -> CSV',      activo: true,  requiereJSON: true  },
    { num: 13, id: 'json-a-xlsx',  texto: 'JSON -> XLSX',     activo: false, requiereJSON: true  },
    { num: 14, id: 'csv-a-rtf',    texto: 'CSV -> RTF',       activo: false, requiereJSON: false },
    { num: 15, id: 'xlsx-a-rtf',   texto: 'XLSX -> RTF',      activo: false, requiereJSON: false },
    { num: 17, id: 'txt-utf8',     texto: 'TXT -> UTF-8',     activo: false, requiereJSON: false }
  ];

  // ---- Mapa id -> funcion ejecutar ----
  // A medida que programemos cada modulo, agregamos su linea aca.
  const ACCIONES = {
    'cargar-json': () => ACCION_CARGAR_JSON.ejecutar(),
    'json-a-csv':  () => ACCION_JSON_A_CSV.ejecutar(),
    'split':       () => ACCION_SPLIT.ejecutar()
    // 'crear-db':    () => ACCION_CREAR_DB.ejecutar(),
    // 'ver-db':      () => ACCION_VER_DB.ejecutar(),
    // 'exportar':    () => ACCION_EXPORTAR.ejecutar(),
    // 'abrir-sqlite':() => ACCION_ABRIR_SQLITE.ejecutar(),
    // 'resumen-db':  () => ACCION_RESUMEN_DB.ejecutar(),
    // 'arbol-db':    () => ACCION_ARBOL_DB.ejecutar(),
    // 'diagrama-er': () => ACCION_DIAGRAMA_ER.ejecutar(),
    // 'csv-a-sqlite':() => ACCION_CSV_A_SQLITE.ejecutar(),
    // 'explorar':    () => ACCION_EXPLORAR.ejecutar(),
    // 'json-a-xlsx': () => ACCION_JSON_A_XLSX.ejecutar(),
    // 'csv-a-rtf':   () => ACCION_CSV_A_RTF.ejecutar(),
    // 'xlsx-a-rtf':  () => ACCION_XLSX_A_RTF.ejecutar(),
    // 'txt-utf8':    () => ACCION_TXT_UTF8.ejecutar()
  };

  // ---- Dibujar el menu ----
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

      // Determinar si hay que deshabilitar
      const faltaJSON = b.requiereJSON && !hayJSON;
      const sinProgramar = !b.activo;

      if (faltaJSON || sinProgramar) {
        btn.disabled = true;
      }

      // Tooltip segun estado
      if (sinProgramar) {
        btn.title = 'Proximamente: modulo no migrado todavia';
      } else if (faltaJSON) {
        btn.title = 'Primero carga un JSON';
      } else {
        btn.title = 'Ejecutar: ' + b.texto;
      }

      // Handler de click
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

  // ---- Redibujar (se llama cuando cambia el estado) ----
  function refrescar() {
    dibujar();
  }

  return { dibujar, refrescar, BOTONES };
})();
