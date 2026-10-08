/* ============================================================
   PYM Util - Accion: CSV -> RTF
   Archivo: js/acciones/csv-a-rtf.js

   Porta la logica de PYM_CSV_A_RTF.pbi
   - Detecta separador (; , o TAB)
   - Preview primeras 100 filas
   - Opciones: portada, encabezados, numerar, zebra, colores, paginar
   - Exporta a RTF
   ============================================================ */

const ACCION_CSV_A_RTF = (() => {

  /* ============================================================
     PALETAS (reusa la misma que exportar.js)
     ============================================================ */
  const PALETAS = [
    {
      nombre: 'Verde PYM',
      tituloTexto:    [32, 80, 32],
      subtituloTexto: [96, 128, 96],
      headerFondo:    [208, 240, 208],
      headerTexto:    [32, 80, 32],
      filaImpar:      [240, 255, 240],
      borde:          [160, 200, 160]
    },
    {
      nombre: 'Gris (impresion)',
      tituloTexto:    [40, 40, 40],
      subtituloTexto: [120, 120, 120],
      headerFondo:    [220, 220, 220],
      headerTexto:    [20, 20, 20],
      filaImpar:      [245, 245, 245],
      borde:          [180, 180, 180]
    }
  ];

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function rtfColor(rgb) {
    return '\\red' + rgb[0] + '\\green' + rgb[1] + '\\blue' + rgb[2] + ';';
  }

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
      else if (c === 9) res += ' ';
      else if (c > 32767) res += '\\u' + (c - 65536) + '?';
      else if (c > 127) res += '\\u' + c + '?';
      else res += String.fromCharCode(c);
    }
    return res;
  }

  /* ============================================================
     DETECCION DE SEPARADOR
     ============================================================ */
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

  /* ============================================================
     DIVIDIR LINEA POR SEPARADOR (respeta comillas)
     ============================================================ */
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
            actual += '"';
            i++;
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

  /* ============================================================
     LEER CSV
     ============================================================ */
  function leerCSV(texto) {
    // Normalizar saltos de linea
    texto = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Quitar BOM UTF-8 si quedo
    if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);

    // Partir en lineas no vacias
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

  /* ============================================================
     GENERAR RTF
     ============================================================ */
  function generarRTF(encabezados, filas, opciones, nombreArchivo) {
    const p = PALETAS[opciones.paleta];
    const nCols = encabezados.length;
    if (nCols === 0) throw new Error('No hay columnas');

    const anchoTotal = nCols >= 7 ? 14400 : 9900;
    const apaisado = nCols >= 7;
    const fs = nCols <= 6 ? 22 : (nCols <= 10 ? 18 : 14);

    // Anchos proporcionales
    const anchos = [];
    const lens = [];
    let sumLen = 0;

    for (let i = 0; i < nCols; i++) {
      let L = String(encabezados[i] || '').length;
      if (L < 5) L = 5;
      if (L > 40) L = 40;
      lens[i] = L;
      sumLen += L;
    }
    for (let i = 0; i < nCols; i++) {
      anchos[i] = Math.max(400, Math.floor((anchoTotal - (opciones.numerar ? 600 : 0)) * lens[i] / sumLen));
    }

    // Header RTF
    let res = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082\n';
    res += apaisado ? '\\paperw15840\\paperh12240\\landscape' : '\\paperw12240\\paperh15840';
    res += '\\margl720\\margr720\\margt720\\margb720\n';
    res += '{\\fonttbl{\\f0 Calibri;}{\\f1 Consolas;}}\n';
    res += '{\\colortbl ;\n';
    res += rtfColor(p.tituloTexto)    + '\n';
    res += rtfColor(p.subtituloTexto) + '\n';
    res += rtfColor(p.headerTexto)    + '\n';
    res += rtfColor(p.headerFondo)    + '\n';
    res += rtfColor(p.filaImpar)      + '\n';
    res += rtfColor(p.borde)          + '\n';
    res += '}\n';
    res += '\\f0\\fs' + fs + '\n';

    // Portada
    if (opciones.portada) {
      const fecha = new Date().toLocaleString('es-AR');
      res += '\\pard\\qc\\b\\fs40\\cf1 ' + escRTF('PYM Util - Reporte') + '\\b0\\fs' + fs + '\\cf0\\par\n';
      res += '\\pard\\qc\\cf2 ' + escRTF('Archivo: ' + nombreArchivo) + '\\cf0\\par\n';
      res += '\\pard\\qc\\cf2 ' + escRTF('Registros: ' + filas.length + ' | Generado: ' + fecha) + '\\cf0\\par\n';
      res += '\\pard\\par\n';
    }

    // Helper: definicion de fila
    function defTabla(fondo) {
      let s = '\\trowd\\trgaph70\\trleft0';
      let x = 0;
      for (let i = 0; i < nCols; i++) {
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
      for (const h of encabezados) {
        res += '\\pard\\intbl\\b\\cf3 ' + escRTF(h) + '\\b0\\cf0\\cell ';
      }
      res += '\\row\n';
    }

    // Filas
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const zebra = opciones.zebra && (i % 2 === 1);
      res += defTabla(zebra ? 5 : 0);

      let pb = '';
      if (opciones.paginar && i > 0 && i % 40 === 0) pb = '\\pagebb';

      if (opciones.numerar) {
        res += '\\pard\\intbl\\qc' + pb + ' ' + (i + 1) + '\\cell ';
        pb = '';
      }

      for (let c = 0; c < nCols; c++) {
        let celda = String(fila[c] || '');
        if (celda.length > 80) celda = celda.slice(0, 77) + '...';

        // Detectar numerico
        const limpio = celda.replace(/[.,\-]/g, '');
        const esNum = limpio !== '' && /^\d+$/.test(limpio);

        res += '\\pard\\intbl' + pb + (esNum ? '\\qr' : '') + ' ' + escRTF(celda) + '\\cell ';
        pb = '';
      }
      res += '\\row\n';
    }

    res += '\\pard\n}\n';
    return res;
  }

  /* ============================================================
     MODAL
     ============================================================ */
  function abrirModal(file, csv) {
    const { encabezados, filas, separador } = csv;
    const sepNombre = separador === '\t' ? 'TAB' : separador;

    // Preview primeras 100 filas
    const preview = filas.slice(0, 100);
    const cabeceraHTML = encabezados.map(h => '<th>' + UI.esc(h) + '</th>').join('');
    const filasHTML = preview.map(f =>
      '<tr>' + encabezados.map((_, i) => '<td>' + UI.esc(f[i] || '') + '</td>').join('') + '</tr>'
    ).join('');

    const base = file.name.replace(/\.[^.]+$/, '');

    const html = `
      <div class="pym-c2r-info">
        <b>Archivo:</b> ${UI.esc(file.name)} &nbsp;|&nbsp;
        <b>Separador:</b> '${UI.esc(sepNombre)}' &nbsp;|&nbsp;
        <b>Columnas:</b> ${encabezados.length} &nbsp;|&nbsp;
        <b>Filas:</b> ${filas.length}
      </div>

      <div class="pym-c2r-layout">
        <div class="pym-c2r-izq">
          <h4>Vista previa (primeras 100 filas)</h4>
          <div class="pym-c2r-preview">
            <table class="pym-tabla">
              <thead><tr>${cabeceraHTML}</tr></thead>
              <tbody>${filasHTML}</tbody>
            </table>
          </div>
        </div>

        <div class="pym-c2r-der">
          <h4>Opciones</h4>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-portada" checked> Portada / encabezado</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-encab" checked> Encabezados de tabla</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-numerar"> Numerar filas</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-zebra" checked> Filas alternadas (zebra)</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-colores" checked> Usar colores</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="c2r-paginar" checked> Salto de pagina cada 40 filas</label>

          <h4 style="margin-top:14px;">Paleta</h4>
          <select id="c2r-paleta" style="width:100%;padding:6px;border:1px solid #a0c8a0;border-radius:6px;">
            <option value="0">Verde PYM</option>
            <option value="1">Gris (impresion)</option>
          </select>

          <h4 style="margin-top:14px;">Archivo de salida</h4>
          <input type="text" id="c2r-nombre" value="${UI.esc(base)}.rtf"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">
        </div>
      </div>

      <div class="pym-exp-estado" id="c2r-estado">Listo. Configura y pulsa Convertir.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '14) CSV -> RTF',
      ancho: 1000,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Convertir a RTF', onClick: (v) => convertir(v, encabezados, filas, file.name) }
      ]
    });
  }

  /* ============================================================
     CONVERTIR Y DESCARGAR
     ============================================================ */
  function convertir(v, encabezados, filas, nombreArchivo) {
    const opciones = {
      portada:    v.cuerpo.querySelector('#c2r-portada').checked,
      encabezados: v.cuerpo.querySelector('#c2r-encab').checked,
      numerar:    v.cuerpo.querySelector('#c2r-numerar').checked,
      zebra:      v.cuerpo.querySelector('#c2r-zebra').checked,
      colores:    v.cuerpo.querySelector('#c2r-colores').checked,
      paginar:    v.cuerpo.querySelector('#c2r-paginar').checked,
      paleta:     parseInt(v.cuerpo.querySelector('#c2r-paleta').value, 10)
    };

    const nombre = v.cuerpo.querySelector('#c2r-nombre').value || 'salida.rtf';

    let rtf;
    try {
      rtf = generarRTF(encabezados, filas, opciones, nombreArchivo);
    } catch (e) {
      UI.toast('Error al generar RTF: ' + e.message, 'error');
      return;
    }

    UI.descargar(nombre, rtf, 'application/rtf');
    UI.toast('RTF generado: ' + nombre);
    v.cuerpo.querySelector('#c2r-estado').textContent = 'Exportado: ' + nombre;
  }

  /* ============================================================
     EJECUTAR
     ============================================================ */
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

    abrirModal(file, csv);
  }

  return { ejecutar };

})();
