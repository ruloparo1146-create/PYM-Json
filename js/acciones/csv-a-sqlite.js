/* ============================================================
   PYM Util - Accion: CSV -> SQLite
   Archivo: js/acciones/csv-a-sqlite.js

   - Detecta separador (; , o TAB)
   - Primera linea = encabezados
   - Crea tabla con sanitizado de nombres
   - Inserta filas en transaccion
   - Descarga .sqlite
   ============================================================ */

const ACCION_CSV_A_SQLITE = (() => {

  /* --------------------------------------------------------
     Detectar separador
     -------------------------------------------------------- */
  function detectarSeparador(lineas) {
    let nPC = 0, nComa = 0, nTab = 0;
    const max = Math.min(lineas.length, 10);

    for (let i = 0; i < max; i++) {
      const l = lineas[i];
      for (let j = 0; j < l.length; j++) {
        const c = l.charCodeAt(j);
        if (c === 59) nPC++;
        else if (c === 44) nComa++;
        else if (c === 9) nTab++;
      }
    }

    if (nTab >= nPC && nTab >= nComa && nTab > 0) return '\t';
    if (nPC >= nComa) return ';';
    return ',';
  }

  /* --------------------------------------------------------
     Dividir linea por separador (respeta comillas)
     -------------------------------------------------------- */
  function dividirLinea(linea, sep) {
    const partes = [];
    let actual = '';
    let dentro = false;
    const n = linea.length;

    for (let i = 0; i < n; i++) {
      const c = linea[i];
      if (c === '"') {
        if (dentro) {
          if (i < n - 1 && linea[i + 1] === '"') {
            actual += '"'; i++;
          } else {
            dentro = false;
          }
        } else {
          dentro = true;
        }
      } else if (c === sep && !dentro) {
        partes.push(actual.trim());
        actual = '';
      } else {
        actual += c;
      }
    }
    partes.push(actual.trim());
    return partes;
  }

  /* --------------------------------------------------------
     Leer CSV
     -------------------------------------------------------- */
  function leerCSV(texto) {
    texto = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);

    const lineas = texto.split('\n').filter(l => l.trim() !== '');
    if (lineas.length === 0) throw new Error('Archivo vacio');

    const sep = detectarSeparador(lineas);
    const encabezados = [];
    const filas = [];
    let primera = true;

    for (const l of lineas) {
      if (l.indexOf(sep) === -1) continue;
      const partes = dividirLinea(l, sep);
      if (primera) {
        encabezados.push(...partes);
        primera = false;
      } else {
        filas.push(partes);
      }
    }

    return { encabezados, filas, separador: sep };
  }

  /* --------------------------------------------------------
     Sanitizar nombre de tabla/columna
     -------------------------------------------------------- */
  function sanear(s) {
    return String(s)
      .replace(/\s+/g, '_')
      .replace(/[-.\/]/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '');
  }

  /* --------------------------------------------------------
     Escapar valor para SQL
     -------------------------------------------------------- */
  function quote(v) {
    if (v === null || v === undefined) return 'NULL';
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  /* --------------------------------------------------------
     Modal
     -------------------------------------------------------- */
  function abrirModal(file, csv) {
    const { encabezados, filas, separador } = csv;
    const sepNombre = separador === '\t' ? 'TAB' : separador;

    const preview = filas.slice(0, 100);
    const cabeceraHTML = encabezados.map(h => '<th>' + UI.esc(h) + '</th>').join('');
    const filasHTML = preview.map(f =>
      '<tr>' + encabezados.map((_, i) => '<td>' + UI.esc(f[i] || '') + '</td>').join('') + '</tr>'
    ).join('');

    const base = file.name.replace(/\.[^.]+$/, '');
    const tablaSug = sanear(base) || 'tabla_csv';

    const html = `
      <div class="pym-c2r-info">
        <b>Archivo:</b> ${UI.esc(file.name)} &nbsp;|&nbsp;
        <b>Separador:</b> '${UI.esc(sepNombre)}' &nbsp;|&nbsp;
        <b>Columnas:</b> ${encabezados.length} &nbsp;|&nbsp;
        <b>Filas:</b> ${filas.length}
      </div>

      <div class="pym-c2s-layout">
        <div class="pym-c2s-izq">
          <h4>Vista previa (primeras 100 filas)</h4>
          <div class="pym-c2r-preview">
            <table class="pym-tabla">
              <thead><tr>${cabeceraHTML}</tr></thead>
              <tbody>${filasHTML}</tbody>
            </table>
          </div>
        </div>

        <div class="pym-c2s-der">
          <h4>Configuracion</h4>
          <label style="display:block;margin:8px 0;font-size:0.85rem;">Nombre de la tabla:</label>
          <input type="text" id="c2s-tabla" value="${UI.esc(tablaSug)}"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">

          <label style="display:block;margin:12px 0 4px;font-size:0.85rem;">
            <input type="checkbox" id="c2s-reemplazar" checked> Reemplazar tabla si existe
          </label>

          <h4 style="margin-top:14px;">Archivo de salida</h4>
          <input type="text" id="c2s-nombre" value="${UI.esc(base)}.sqlite"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">
        </div>
      </div>

      <div class="pym-exp-estado" id="c2s-estado">Listo. Configura y pulsa Convertir.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '16) CSV -> SQLite',
      ancho: 1000,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Convertir a SQLite', onClick: (v) => convertir(v, encabezados, filas) }
      ]
    });
  }

  /* --------------------------------------------------------
     Convertir
     -------------------------------------------------------- */
  async function convertir(v, encabezados, filas) {
    const nombreTabla = sanear(v.cuerpo.querySelector('#c2s-tabla').value) || 'tabla_csv';
    const reemplazar  = v.cuerpo.querySelector('#c2s-reemplazar').checked;
    const nombreSalida = v.cuerpo.querySelector('#c2s-nombre').value || 'salida.sqlite';
    const estado = v.cuerpo.querySelector('#c2s-estado');

    estado.textContent = 'Inicializando SQLite...';
    window.dispatchEvent(new Event('resize'));

    // Inicializar SQLITE
    if (!SQLITE.listo) {
      const ok = await SQLITE.init();
      if (!ok) {
        UI.toast('No se pudo inicializar SQLite', 'error');
        return;
      }
    }

    SQLITE.crear();

    // DROP si reemplazar
    if (reemplazar) {
      SQLITE.ejecutar('DROP TABLE IF EXISTS ' + nombreTabla);
    }

    // CREATE TABLE
    let sqlCreate = 'CREATE TABLE ' + nombreTabla + ' (id INTEGER PRIMARY KEY AUTOINCREMENT';
    for (const h of encabezados) {
      sqlCreate += ', ' + sanear(h) + ' TEXT';
    }
    sqlCreate += ')';

    if (!SQLITE.ejecutar(sqlCreate)) {
      UI.toast('No se pudo crear la tabla', 'error');
      return;
    }

    // INSERT en transaccion
    SQLITE.ejecutar('BEGIN TRANSACTION');

    const colsSQL = encabezados.map(h => sanear(h)).join(', ');
    let insertadas = 0;

    for (const fila of filas) {
      const vals = encabezados.map((_, i) => quote(fila[i] || ''));
      const sqlIns = 'INSERT INTO ' + nombreTabla + ' (' + colsSQL + ') VALUES (' + vals.join(', ') + ')';
      if (SQLITE.ejecutar(sqlIns)) insertadas++;
    }

    SQLITE.ejecutar('COMMIT');

    // Exportar y descargar
    const bytes = SQLITE.exportar();
    const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
    UI.descargar(nombreSalida, blob, 'application/x-sqlite3');

    estado.textContent = 'OK. ' + insertadas + ' filas insertadas en tabla "' + nombreTabla + '"';
    UI.toast('SQLite generado: ' + nombreSalida + ' (' + insertadas + ' filas)');
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  async function ejecutar() {
    const file = await UI.pedirArchivo('.csv,.txt,text/csv,text/plain');
    if (!file) return;

    let texto;
    try {
      texto = await file.text();
    } catch (e) {
      UI.toast('Error al leer el archivo: ' + e.message, 'error');
      return;
    }

    let csv;
    try {
      csv = leerCSV(texto);
    } catch (e) {
      UI.toast('CSV invalido: ' + e.message, 'error');
      return;
    }

    if (csv.encabezados.length === 0) {
      UI.toast('El CSV no tiene encabezados', 'error');
      return;
    }

    abrirModal(file, csv);
  }

  return { ejecutar };

})();
