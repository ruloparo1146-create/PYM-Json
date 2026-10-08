/* ============================================================
   PYM Util - Accion: Exportar (JSON -> RTF / HTML / TXT)
   Archivo: js/acciones/exportar.js

   Porta la logica de PYM_EXPORT.pbi
   - 3 formatos: RTF (Word), HTML (navegador), TXT (plano)
   - Paletas: Verde PYM / Gris (impresion)
   - Opciones: portada, encabezados, simbolos, tabla/lista,
               numerar, zebra, paginar, colores
   ============================================================ */

const ACCION_EXPORTAR = (() => {

  /* ============================================================
     PALETAS
     ============================================================ */
  const PALETAS = [
    {
      nombre: 'Verde PYM',
      tituloTexto:    [32, 80, 32],
      subtituloTexto: [96, 128, 96],
      headerFondo:    [208, 240, 208],
      headerTexto:    [32, 80, 32],
      filaPar:        [255, 255, 255],
      filaImpar:      [240, 255, 240],
      borde:          [160, 200, 160]
    },
    {
      nombre: 'Gris (impresion)',
      tituloTexto:    [40, 40, 40],
      subtituloTexto: [120, 120, 120],
      headerFondo:    [220, 220, 220],
      headerTexto:    [20, 20, 20],
      filaPar:        [255, 255, 255],
      filaImpar:      [245, 245, 245],
      borde:          [180, 180, 180]
    }
  ];

  /* ============================================================
     UTILIDADES
     ============================================================ */

  // Convierte [r,g,b] a string RTF de color
  function rtfColor(rgb) {
    return '\\red' + rgb[0] + '\\green' + rgb[1] + '\\blue' + rgb[2] + ';';
  }

  // Convierte [r,g,b] a HEX (#RRGGBB)
  function htmlColor(rgb) {
    const h = (n) => n.toString(16).padStart(2, '0');
    return '#' + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }

  // Escapa un texto para RTF (convierte a \uN? los >127)
  function escRTF(s) {
    const txt = String(s == null ? '' : s);
    let res = '';
    for (let i = 0; i < txt.length; i++) {
      const c = txt.charCodeAt(i);
      if (c === 92) res += '\\\\';
      else if (c === 123) res += '\\{';
      else if (c === 125) res += '\\}';
      else if (c === 10) res += '\\line ';
      else if (c === 13) { /* ignorar */ }
      else if (c === 9) res += '\\tab ';
      else if (c > 32767) res += '\\u' + (c - 65536) + '?';
      else if (c > 127) res += '\\u' + c + '?';
      else res += String.fromCharCode(c);
    }
    return res;
  }

  // Escapa texto para HTML
  function escHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Formatea numero con separador de miles
  function formatearNumero(n) {
    if (typeof n !== 'number') return String(n);
    if (!isFinite(n)) return String(n);
    const signo = n < 0 ? '-' : '';
    n = Math.abs(n);
    const esEntero = n === Math.floor(n);
    let s = esEntero ? String(Math.floor(n)) : n.toFixed(2);
    let [entera, decimal] = s.split('.');
    entera = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return signo + entera + (decimal ? '.' + decimal : '');
  }

  // Convierte un valor JSON a texto plano
  function valorATexto(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return formatearNumero(v);
    if (typeof v === 'boolean') return v ? 'Si' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  // Detecta si un valor es numerico
  function esNumerico(v) {
    return typeof v === 'number';
  }

  /* ============================================================
     CARGA DE COLUMNAS
     ============================================================ */
  function obtenerColumnas(obj) {
    const setCols = new Set();

    if (Array.isArray(obj)) {
      for (const el of obj) {
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          for (const k of Object.keys(el)) setCols.add(k);
        }
      }
    } else if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) setCols.add(k);
    }
    return Array.from(setCols);
  }

  /* ============================================================
     GENERAR RTF
     ============================================================ */
  function generarRTF(obj, sel, opciones) {
    const esArray = Array.isArray(obj);
    const filas = esArray ? obj : [obj];
    const totalFilas = filas.length;

    const p = PALETAS[opciones.paleta];
    const nCols = sel.length;

    // Anchos de tabla (en twips)
    const anchoTotal = nCols >= 7 ? 14400 : 9900;
    const apaisado = nCols >= 7;
    const fs = nCols <= 6 ? 22 : (nCols <= 10 ? 18 : 14);

    // Anchos proporcionales
    const anchos = [];
    let sumLen = 0;
    const lens = sel.map(c => {
      let L = String(c).length;
      for (let i = 0; i < Math.min(filas.length, 200); i++) {
        const v = valorATexto(filas[i]?.[c]);
        if (v.length > L) L = v.length;
      }
      if (L < 5) L = 5;
      if (L > 40) L = 40;
      sumLen += L;
      return L;
    });

    for (let i = 0; i < nCols; i++) {
      anchos[i] = Math.max(400, Math.floor((anchoTotal - (opciones.numerar ? 600 : 0)) * lens[i] / sumLen));
    }

    // Header RTF
    let res = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082\n';
    res += apaisado ? '\\paperw15840\\paperh12240\\landscape' : '\\paperw12240\\paperh15840';
    res += '\\margl720\\margr720\\margt720\\margb720\n';
    res += '{\\fonttbl{\\f0 Calibri;}{\\f1 Consolas;}}\n';
    res += '{\\colortbl ;\n';
    res += rtfColor(p.tituloTexto)    + '\n';    // cf1
    res += rtfColor(p.subtituloTexto) + '\n';    // cf2
    res += rtfColor(p.headerTexto)    + '\n';    // cf3
    res += rtfColor(p.headerFondo)    + '\n';    // cf4
    res += rtfColor(p.filaImpar)      + '\n';    // cf5
    res += rtfColor(p.borde)          + '\n';    // cf6
    res += '}\n';
    res += '\\f0\\fs' + fs + '\n';

    // Portada
    if (opciones.portada) {
      const fecha = new Date().toLocaleString('es-AR');
      res += '\\pard\\qc\\b\\fs40\\cf1 ' + escRTF('PYM Util - Reporte') + '\\b0\\fs' + fs + '\\cf0\\par\n';
      res += '\\pard\\qc\\cf2 ' + escRTF('Registros: ' + totalFilas + '   |   Generado: ' + fecha) + '\\cf0\\par\n';
      res += '\\pard\\par\n';
    }

    // Helper: definicion de fila (bordes y fondo)
    function defTabla(fondo) {
      let s = '\\trowd\\trgaph70\\trleft0';
      let x = 0;
      for (let i = 0; i < nCols; i++) {
        if (i === 0 && !opciones.numerar) {
          // Sin numerar: no hay celda extra
        }
        x += anchos[i];
        s += '\\clbrdrt\\brdrs\\brdrw10\\brdrcf6';
        s += '\\clbrdrl\\brdrs\\brdrw10\\brdrcf6';
        s += '\\clbrdrb\\brdrs\\brdrw10\\brdrcf6';
        s += '\\clbrdrr\\brdrs\\brdrw10\\brdrcf6';
        if (fondo > 0) s += '\\clcbpat' + fondo;
        s += '\\cellx' + x;
      }
      return s + '\n';
    }

    // Encabezado de tabla
    if (opciones.encabezados) {
      res += defTabla(4);
      if (opciones.numerar) {
        res += '\\pard\\intbl\\qc\\b\\cf3 #\\b0\\cf0\\cell ';
      }
      for (const c of sel) {
        res += '\\pard\\intbl\\b\\cf3 ' + escRTF(c) + '\\b0\\cf0\\cell ';
      }
      res += '\\row\n';
    }

    // Filas
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const zebra = opciones.zebra && (i % 2 === 1);
      res += defTabla(zebra ? 5 : 0);

      // Salto de pagina cada 40 filas
      let pb = '';
      if (opciones.paginar && i > 0 && i % 40 === 0) pb = '\\pagebb';

      if (opciones.numerar) {
        res += '\\pard\\intbl\\qc' + pb + ' ' + (i + 1) + '\\cell ';
        pb = '';
      }

      for (const c of sel) {
        const v = fila?.[c];
        let txt = valorATexto(v);
        if (txt.length > 80) txt = txt.slice(0, 77) + '...';

        const num = esNumerico(v);
        res += '\\pard\\intbl' + pb + (num ? '\\qr' : '') + ' ' + escRTF(txt) + '\\cell ';
        pb = '';
      }
      res += '\\row\n';
    }

    res += '\\pard\n}\n';
    return res;
  }

  /* ============================================================
     GENERAR HTML
     ============================================================ */
  function generarHTML(obj, sel, opciones) {
    const esArray = Array.isArray(obj);
    const filas = esArray ? obj : [obj];
    const totalFilas = filas.length;

    const p = PALETAS[opciones.paleta];
    const fecha = new Date().toLocaleString('es-AR');

    let html = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8">\n';
    html += '<title>PYM Util - Reporte</title>\n';
    html += '<style>\n';
    html += 'body { font-family: Calibri, Arial, sans-serif; margin: 30px; color: #222; }\n';
    html += 'h1 { color: ' + htmlColor(p.tituloTexto) + '; font-size: 28px; margin-bottom: 4px; }\n';
    html += 'h2 { color: ' + htmlColor(p.subtituloTexto) + '; font-size: 14px; font-weight: normal; margin-top: 0; }\n';
    html += 'table { border-collapse: collapse; width: 100%; margin-top: 20px; }\n';
    html += 'th { background: ' + htmlColor(p.headerFondo) + '; color: ' + htmlColor(p.headerTexto) + '; ';
    html += 'padding: 8px 12px; text-align: left; border: 1px solid ' + htmlColor(p.borde) + '; font-weight: bold; }\n';
    html += 'td { padding: 6px 12px; border: 1px solid ' + htmlColor(p.borde) + '; }\n';
    if (opciones.zebra) {
      html += 'tr:nth-child(even) td { background: ' + htmlColor(p.filaImpar) + '; }\n';
    }
    html += 'td.num { text-align: right; font-family: Consolas, monospace; }\n';
    html += '.meta { font-size: 13px; color: ' + htmlColor(p.subtituloTexto) + '; margin-bottom: 20px; }\n';
    html += '</style></head><body>\n';

    if (opciones.portada) {
      html += '<h1>PYM Util - Reporte</h1>\n';
      html += '<div class="meta">Registros: ' + totalFilas + ' | Generado: ' + escHTML(fecha) + '</div>\n';
    }

    if (opciones.encabezados) {
      html += '<table>\n<thead>\n<tr>';
      if (opciones.numerar) html += '<th>#</th>';
      for (const c of sel) html += '<th>' + escHTML(c) + '</th>';
      html += '</tr>\n</thead>\n<tbody>\n';
    } else {
      html += '<table>\n<tbody>\n';
    }

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      html += '<tr>';
      if (opciones.numerar) html += '<td>' + (i + 1) + '</td>';

      for (const c of sel) {
        const v = fila?.[c];
        let txt = valorATexto(v);
        if (txt.length > 200) txt = txt.slice(0, 200) + '...';
        const num = esNumerico(v);
        html += '<td' + (num ? ' class="num"' : '') + '>' + escHTML(txt) + '</td>';
      }
      html += '</tr>\n';
    }

    html += '</tbody></table>\n</body></html>\n';
    return html;
  }

  /* ============================================================
     GENERAR TXT
     ============================================================ */
  function generarTXT(obj, sel, opciones) {
    const esArray = Array.isArray(obj);
    const filas = esArray ? obj : [obj];
    const totalFilas = filas.length;
    const fecha = new Date().toLocaleString('es-AR');

    const lineas = [];

    if (opciones.portada) {
      lineas.push('==========================================================');
      lineas.push('  PYM Util - Reporte');
      lineas.push('  Registros: ' + totalFilas);
      lineas.push('  Generado: ' + fecha);
      lineas.push('==========================================================');
      lineas.push('');
    }

    if (opciones.encabezados) {
      if (opciones.numerar) lineas.push('#\t' + sel.join('\t'));
      else lineas.push(sel.join('\t'));
    }

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const celdas = sel.map(c => {
        let t = valorATexto(fila?.[c]);
        if (t.length > 200) t = t.slice(0, 200) + '...';
        return t;
      });
      if (opciones.numerar) celdas.unshift(String(i + 1));
      lineas.push(celdas.join('\t'));
    }

    return lineas.join('\n');
  }

  /* ============================================================
     ABRIR MODAL
     ============================================================ */
  function abrirModal() {
    const obj = ESTADO.datos.objetoJSON;
    const columnas = obtenerColumnas(obj);

    if (columnas.length === 0) {
      UI.toast('El JSON no tiene columnas para exportar', 'error');
      return;
    }

    const opcionesCols = columnas.map((c, i) =>
      '<label class="pym-exp-col">' +
      '<input type="checkbox" data-col="' + i + '" checked> ' +
      UI.esc(c) + '</label>'
    ).join('');

    const html = `
      <div class="pym-exp-layout">
        <div class="pym-exp-izq">
          <h4>Columnas a exportar</h4>
          <div class="pym-exp-cols">${opcionesCols}</div>
          <button id="exp-todas" class="pym-btn-mini">Marcar todas</button>
          <button id="exp-ninguna" class="pym-btn-mini secundario">Desmarcar todas</button>
        </div>

        <div class="pym-exp-der">
          <h4>Formato</h4>
          <div class="pym-exp-radios">
            <label><input type="radio" name="exp-formato" value="rtf" checked> RTF (Word)</label>
            <label><input type="radio" name="exp-formato" value="html"> HTML (navegador)</label>
            <label><input type="radio" name="exp-formato" value="txt"> TXT (texto plano)</label>
          </div>

          <h4>Paleta</h4>
          <select id="exp-paleta">
            <option value="0">Verde PYM</option>
            <option value="1">Gris (impresion)</option>
          </select>

          <h4>Opciones</h4>
          <div class="pym-exp-opts">
            <label><input type="checkbox" id="exp-portada" checked> Portada / encabezado</label>
            <label><input type="checkbox" id="exp-encab" checked> Encabezados de tabla</label>
            <label><input type="checkbox" id="exp-simbolos" checked> Usar simbolos</label>
            <label><input type="checkbox" id="exp-tabla" checked> Formato tabla (sino lista)</label>
            <label><input type="checkbox" id="exp-numerar"> Numerar filas</label>
            <label><input type="checkbox" id="exp-zebra" checked> Filas alternadas (zebra)</label>
            <label><input type="checkbox" id="exp-paginar" checked> Salto de pagina cada 40 filas</label>
          </div>
        </div>
      </div>
      <div class="pym-exp-estado" id="exp-estado">Listo. Configura y pulsa Exportar.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '4) Exportar JSON',
      ancho: 800,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Exportar', onClick: (v) => ejecutarExportacion(v, columnas) }
      ]
    });

    // Handlers auxiliares
    v.cuerpo.querySelector('#exp-todas').addEventListener('click', () => {
      v.cuerpo.querySelectorAll('.pym-exp-col input').forEach(c => c.checked = true);
    });
    v.cuerpo.querySelector('#exp-ninguna').addEventListener('click', () => {
      v.cuerpo.querySelectorAll('.pym-exp-col input').forEach(c => c.checked = false);
    });
  }

  /* ============================================================
     EJECUTAR EXPORTACION
     ============================================================ */
  function ejecutarExportacion(v, columnas) {
    const sel = [];
    v.cuerpo.querySelectorAll('.pym-exp-col input:checked').forEach(c => {
      sel.push(columnas[parseInt(c.dataset.col, 10)]);
    });

    if (sel.length === 0) {
      UI.toast('Marca al menos una columna', 'error');
      return;
    }

    const formato = v.cuerpo.querySelector('input[name="exp-formato"]:checked').value;
    const opciones = {
      paleta:     parseInt(v.cuerpo.querySelector('#exp-paleta').value, 10),
      portada:    v.cuerpo.querySelector('#exp-portada').checked,
      encabezados: v.cuerpo.querySelector('#exp-encab').checked,
      simbolos:   v.cuerpo.querySelector('#exp-simbolos').checked,
      tabla:      v.cuerpo.querySelector('#exp-tabla').checked,
      numerar:    v.cuerpo.querySelector('#exp-numerar').checked,
      zebra:      v.cuerpo.querySelector('#exp-zebra').checked,
      paginar:    v.cuerpo.querySelector('#exp-paginar').checked
    };

    const obj = ESTADO.datos.objetoJSON;
    let contenido = '';
    let extension = '';

    try {
      if (formato === 'rtf') {
        contenido = generarRTF(obj, sel, opciones);
        extension = 'rtf';
      } else if (formato === 'html') {
        contenido = generarHTML(obj, sel, opciones);
        extension = 'html';
      } else {
        contenido = generarTXT(obj, sel, opciones);
        extension = 'txt';
      }
    } catch (e) {
      console.error(e);
      UI.toast('Error al generar: ' + e.message, 'error');
      return;
    }

    const base = (ESTADO.datos.rutaJSON || 'reporte').replace(/\.[^.]+$/, '');
    const nombre = base + '.' + extension;
    const mime = formato === 'rtf' ? 'application/rtf'
                : formato === 'html' ? 'text/html'
                : 'text/plain';

    UI.descargar(nombre, contenido, mime);
    UI.toast('Exportado: ' + nombre);
    v.cuerpo.querySelector('#exp-estado').textContent = 'Exportado: ' + nombre;
  }

  /* ============================================================
     PUNTO DE ENTRADA
     ============================================================ */
  function ejecutar() {
    if (!ESTADO.hayJSON()) {
      UI.toast('Primero carga un JSON', 'error');
      return;
    }
    abrirModal();
  }

  return { ejecutar };

})();
