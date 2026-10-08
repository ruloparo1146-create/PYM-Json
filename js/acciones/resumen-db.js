/* ============================================================
   PYM Util - Accion: Resumen DB
   Archivo: js/acciones/resumen-db.js

   Muestra una tabla con todas las tablas de la DB:
   nombre, columnas, filas, padre (si tiene parent_id)
   Permite exportar el resumen a TXT.
   ============================================================ */

const ACCION_RESUMEN_DB = (() => {

  /* --------------------------------------------------------
     Listar tablas de la DB
     -------------------------------------------------------- */
  function listarTablas() {
    return SQLITE.consultar(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).map(r => r.name);
  }

  /* --------------------------------------------------------
     Contar columnas de una tabla
     -------------------------------------------------------- */
  function contarColumnas(tabla) {
    const info = SQLITE.consultar('PRAGMA table_info(' + tabla + ')');
    return info.length;
  }

  /* --------------------------------------------------------
     Contar filas de una tabla
     -------------------------------------------------------- */
  function contarFilas(tabla) {
    const res = SQLITE.consultar('SELECT COUNT(*) AS n FROM ' + tabla);
    return res.length > 0 ? res[0].n : 0;
  }

  /* --------------------------------------------------------
     Detectar padre a partir del nombre (usa "__")
     -------------------------------------------------------- */
  function nombrePadre(tabla) {
    const idx = tabla.indexOf('__');
    return idx > 0 ? tabla.slice(0, idx) : '';
  }

  /* --------------------------------------------------------
     Verificar si la tabla tiene columna parent_id
     -------------------------------------------------------- */
  function tieneParentId(tabla) {
    const info = SQLITE.consultar('PRAGMA table_info(' + tabla + ')');
    return info.some(c => c.name === 'parent_id');
  }

  /* --------------------------------------------------------
     Armar datos del resumen
     -------------------------------------------------------- */
  function obtenerDatos() {
    const tablas = listarTablas();
    const datos = [];

    let totalFilas = 0;
    for (const t of tablas) {
      const cols  = contarColumnas(t);
      const filas = contarFilas(t);
      totalFilas += filas;

      datos.push({
        nombre: t,
        cols: cols,
        filas: filas,
        padre: nombrePadre(t) || '(raiz)',
        tieneParent: tieneParentId(t)
      });
    }

    return { datos, totalFilas, totalTablas: tablas.length };
  }

  /* --------------------------------------------------------
     Abrir modal
     -------------------------------------------------------- */
  function abrir() {
    if (!SQLITE.db) {
      UI.toast('No hay base de datos abierta', 'error');
      return;
    }

    const { datos, totalFilas, totalTablas } = obtenerDatos();

    if (datos.length === 0) {
      UI.toast('La base de datos no tiene tablas', 'error');
      return;
    }

    // Armar tabla HTML
    const filasHTML = datos.map(d => {
      return '<tr>' +
        '<td>' + UI.esc(d.nombre) + '</td>' +
        '<td style="text-align:center;">' + d.cols + '</td>' +
        '<td style="text-align:center;">' + d.filas + '</td>' +
        '<td>' + UI.esc(d.padre) + '</td>' +
      '</tr>';
    }).join('');

    const html = `
      <div class="pym-res-info">
        <b>Tablas:</b> ${totalTablas} &nbsp;|&nbsp;
        <b>Filas totales:</b> ${totalFilas}
      </div>
      <div class="pym-res-tabla-wrap">
        <table class="pym-tabla pym-res-tabla">
          <thead>
            <tr>
              <th>Tabla</th>
              <th style="width:80px;">Cols</th>
              <th style="width:80px;">Filas</th>
              <th style="width:180px;">Padre</th>
            </tr>
          </thead>
          <tbody>${filasHTML}</tbody>
        </table>
      </div>
    `;

    VENTANA.abrir({
      titulo: '7) Resumen DB',
      ancho: 800,
      html: html,
      botones: [
        { texto: 'Exportar TXT', clase: 'secundario', onClick: (v) => exportarTXT(datos, totalTablas, totalFilas) },
        { texto: 'Cerrar', onClick: (v) => v.cerrar() }
      ]
    });
  }

  /* --------------------------------------------------------
     Exportar el resumen a TXT
     -------------------------------------------------------- */
  function exportarTXT(datos, totalTablas, totalFilas) {
    const lineas = [];
    lineas.push('Resumen de base SQLite');
    lineas.push('Generado: ' + new Date().toLocaleString('es-AR'));
    lineas.push('');
    lineas.push('Tablas: ' + totalTablas + '  |  Filas totales: ' + totalFilas);
    lineas.push('');
    lineas.push('Tabla                          Cols   Filas   Padre');
    lineas.push('-'.repeat(80));

    for (const d of datos) {
      lineas.push(
        d.nombre.padEnd(30, ' ') + ' ' +
        String(d.cols).padStart(5, ' ') + '  ' +
        String(d.filas).padStart(6, ' ') + '   ' +
        d.padre
      );
    }

    const txt = lineas.join('\n');
    UI.descargar('resumen_db.txt', txt, 'text/plain');
    UI.toast('Resumen exportado');
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  async function ejecutar() {
    // Inicializar SQLITE si hace falta
    if (!SQLITE.listo) {
      const ok = await SQLITE.init();
      if (!ok) {
        UI.toast('No se pudo inicializar SQLite', 'error');
        return;
      }
    }

    if (!SQLITE.db) {
      UI.toast('Primero crea o abri una base SQLite', 'error');
      return;
    }

    abrir();
  }

  return { ejecutar };

})();
