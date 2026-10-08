/* ============================================================
   PYM Util - Visor SQLite reutilizable
   Archivo: js/db-viewer.js

   Uso:
     DBV.abrir()  -> abre el visor con la DB que ya esta en SQLITE
   ============================================================ */

const DBV = (() => {

  let v = null;              // referencia al modal actual
  let tablaActual = '';      // tabla seleccionada
  let filtro = '';           // texto de busqueda
  let colFiltro = '';        // columna sobre la que buscar ('' = todas)
  let ordenCol = '';         // columna por la que ordenar
  let ordenAsc = true;       // direccion del orden

  /* --------------------------------------------------------
     Obtener la lista de tablas de la DB
     -------------------------------------------------------- */
  function listarTablas() {
    return SQLITE.consultar(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).map(r => r.name);
  }

  /* --------------------------------------------------------
     Obtener las columnas de una tabla
     -------------------------------------------------------- */
  function listarColumnas(tabla) {
    const info = SQLITE.consultar('PRAGMA table_info(' + tabla + ')');
    return info.map(r => ({
      nombre: r.name,
      tipo: r.type || '',
      pk: r.pk === 1,
      notnull: r.notnull === 1
    }));
  }

  /* --------------------------------------------------------
     Contar filas de una tabla
     -------------------------------------------------------- */
  function contarFilas(tabla) {
    const res = SQLITE.consultar('SELECT COUNT(*) AS n FROM ' + tabla);
    return res.length > 0 ? res[0].n : 0;
  }

  /* --------------------------------------------------------
     Refrescar la grilla con la tabla actual
     -------------------------------------------------------- */
  function refrescarGrilla() {
    if (!v || !tablaActual) return;

    const cols = listarColumnas(tablaActual);
    if (cols.length === 0) return;

    // Armar la consulta con filtro y orden
    let sql = 'SELECT * FROM ' + tablaActual;
    const partes = [];

    if (filtro) {
      const esc = filtro.replace(/'/g, "''");
      if (colFiltro) {
        partes.push("" + colFiltro + " LIKE '%" + esc + "%'");
      } else {
        const ors = cols.map(c => c.nombre + " LIKE '%" + esc + "%'");
        partes.push('(' + ors.join(' OR ') + ')');
      }
    }
    if (partes.length > 0) sql += ' WHERE ' + partes.join(' AND ');
    if (ordenCol) sql += ' ORDER BY ' + ordenCol + (ordenAsc ? ' ASC' : ' DESC');
    sql += ' LIMIT 1000';

    let filas = [];
    try {
      filas = SQLITE.consultar(sql);
    } catch (e) {
      console.error('[DBV] Error SELECT:', e);
      UI.toast('Error al consultar: ' + e.message, 'error');
      return;
    }

    // Contruir tabla HTML
    const total = contarFilas(tablaActual);
    const cabecera = cols.map(c => {
      let etiqueta = c.nombre;
      if (c.pk) etiqueta += ' [PK]';
      return '<th data-col="' + UI.esc(c.nombre) + '">' + UI.esc(etiqueta) + '</th>';
    }).join('');

    const cuerpo = filas.map(fila => {
      return '<tr>' + cols.map(c => {
        const val = fila[c.nombre];
        const txt = val === null ? '' : String(val);
        const short = txt.length > 80 ? txt.slice(0, 77) + '...' : txt;
        return '<td title="' + UI.esc(txt) + '">' + UI.esc(short) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    const html = '<table class="pym-tabla">' +
                 '<thead><tr>' + cabecera + '</tr></thead>' +
                 '<tbody>' + cuerpo + '</tbody>' +
                 '</table>';

    v.cuerpo.querySelector('#dbv-tabla').innerHTML = html;

    // Info
    const info = 'Tabla: <b>' + UI.esc(tablaActual) + '</b>' +
                 ' | Filas: ' + filas.length + ' / ' + total +
                 ' | Columnas: ' + cols.length;
    v.cuerpo.querySelector('#dbv-info').innerHTML = info;

    // Click en cabecera = ordenar
    v.cuerpo.querySelectorAll('#dbv-tabla th').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (ordenCol === col) {
          ordenAsc = !ordenAsc;
        } else {
          ordenCol = col;
          ordenAsc = true;
        }
        refrescarGrilla();
      });
    });
  }

  /* --------------------------------------------------------
     Cargar una tabla en el visor
     -------------------------------------------------------- */
  function cargarTabla(nombre) {
    tablaActual = nombre;
    filtro = '';
    colFiltro = '';
    ordenCol = '';
    ordenAsc = true;

    // Repoblar combo de columnas
    const selCol = v.cuerpo.querySelector('#dbv-col-filtro');
    const cols = listarColumnas(nombre);
    selCol.innerHTML = '<option value="">(todas)</option>' +
      cols.map(c => '<option value="' + UI.esc(c.nombre) + '">' + UI.esc(c.nombre) + '</option>').join('');

    // Limpiar buscador
    v.cuerpo.querySelector('#dbv-buscar').value = '';

    refrescarGrilla();
  }

  /* --------------------------------------------------------
     Abrir el visor
     -------------------------------------------------------- */
  function abrir() {
    // Verificar que hay una DB cargada
    if (!SQLITE.db) {
      UI.toast('No hay base de datos abierta', 'error');
      return;
    }

    const tablas = listarTablas();
    if (tablas.length === 0) {
      UI.toast('La base de datos no tiene tablas', 'error');
      return;
    }

    const opciones = tablas.map(t =>
      '<option value="' + UI.esc(t) + '">' + UI.esc(t) + '</option>'
    ).join('');

    const html = `
      <div class="pym-dbv-barra">
        <label>Tabla:</label>
        <select id="dbv-tabla-sel">${opciones}</select>
        <label style="margin-left:12px;">Buscar:</label>
        <input type="text" id="dbv-buscar" placeholder="texto a buscar...">
        <select id="dbv-col-filtro">
          <option value="">(todas)</option>
        </select>
        <button id="dbv-limpiar" class="pym-btn-mini">Limpiar</button>
      </div>
      <div class="pym-dbv-info" id="dbv-info">Cargando...</div>
      <div class="pym-dbv-tabla-wrap" id="dbv-tabla"></div>
    `;

    v = VENTANA.abrir({
      titulo: '3) Ver DB',
      ancho: 1050,
      html: html,
      botones: [
        { texto: 'Exportar CSV', clase: 'secundario', onClick: exportarCSV },
        { texto: 'Cerrar', onClick: (v) => v.cerrar() }
      ]
    });

    // Handlers
    v.cuerpo.querySelector('#dbv-tabla-sel').addEventListener('change', (e) => {
      cargarTabla(e.target.value);
    });

    v.cuerpo.querySelector('#dbv-buscar').addEventListener('input', (e) => {
      filtro = e.target.value;
      refrescarGrilla();
    });

    v.cuerpo.querySelector('#dbv-col-filtro').addEventListener('change', (e) => {
      colFiltro = e.target.value;
      refrescarGrilla();
    });

    v.cuerpo.querySelector('#dbv-limpiar').addEventListener('click', () => {
      filtro = '';
      colFiltro = '';
      v.cuerpo.querySelector('#dbv-buscar').value = '';
      v.cuerpo.querySelector('#dbv-col-filtro').value = '';
      ordenCol = '';
      ordenAsc = true;
      refrescarGrilla();
    });

    // Cargar primera tabla
    cargarTabla(tablas[0]);
  }

  /* --------------------------------------------------------
     Exportar la tabla actual a CSV
     -------------------------------------------------------- */
  function exportarCSV() {
    if (!tablaActual) return;

    const cols = listarColumnas(tablaActual);
    const filas = SQLITE.consultar('SELECT * FROM ' + tablaActual);

    // BOM UTF-8 + headers
    const escapar = (s) => {
      const v = String(s == null ? '' : s);
      return v.includes(';') || v.includes('"') || v.includes('\n') || v.includes('\r')
        ? '"' + v.replace(/"/g, '""') + '"'
        : v;
    };

    const lineas = [];
    lineas.push(cols.map(c => escapar(c.nombre)).join(';'));
    for (const fila of filas) {
      lineas.push(cols.map(c => escapar(fila[c.nombre])).join(';'));
    }

    const csv = '\uFEFF' + lineas.join('\r\n');
    const nombre = tablaActual + '.csv';
    UI.descargar(nombre, csv, 'text/csv');
    UI.toast('CSV exportado: ' + nombre);
  }

  /* --------------------------------------------------------
     API publica
     -------------------------------------------------------- */
  return { abrir };

})();
