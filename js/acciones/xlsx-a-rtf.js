/* ============================================================
   PYM Util - Accion: XLSX -> RTF
   Archivo: js/acciones/xlsx-a-rtf.js

   Lee un XLSX/XLSM con SheetJS y genera un RTF con una seccion
   por hoja del libro.
   ============================================================ */

const ACCION_XLSX_A_RTF = (() => {

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

  /* --------------------------------------------------------
     Leer XLSX y devolver array de hojas
     Cada hoja: { nombre, encabezados: [], filas: [[]] }
     -------------------------------------------------------- */
  function leerXLSX(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS no esta cargado');
    }
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const hojas = [];

    for (const nombre of wb.SheetNames) {
      const ws = wb.Sheets[nombre];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (aoa.length === 0) {
        hojas.push({ nombre, encabezados: [], filas: [] });
        continue;
      }

      // Primera fila = encabezados
      const encabezados = (aoa[0] || []).map(v => String(v == null ? '' : v));
      const filas = aoa.slice(1).map(f =>
        encabezados.map((_, i) => String(f[i] == null ? '' : f[i]))
      );

      hojas.push({ nombre, encabezados, filas });
    }

    return hojas;
  }

  /* --------------------------------------------------------
     Generar RTF de una hoja
     -------------------------------------------------------- */
  function generarRTFHoja(hoja, opciones, p, esPrimera, nombreArchivo, totalHojas) {
    const nCols = hoja.encabezados.length;
    if (nCols === 0) return '';

    const anchoTotal = nCols >= 7 ? 14400 : 9900;
    const apaisado = nCols >= 7;
    const fs = nCols <= 6 ? 22 : (nCols <= 10 ? 18 : 14);

    const anchos = [];
    const lens = [];
    let sumLen = 0;

    for (let i = 0; i < nCols; i++) {
      let L = String(hoja.encabezados[i] || '').length;
      if (L < 5) L = 5;
      if (L > 40) L = 40;
      lens[i] = L;
      sumLen += L;
    }
    for (let i = 0; i < nCols; i++) {
      anchos[i] = Math.max(400, Math.floor((anchoTotal - (opciones.numerar ? 600 : 0)) * lens[i] / sumLen));
    }

    let res = '';

    // Salto de pagina entre hojas
    if (!esPrimera) {
      res += '\\page\n';
      res += apaisado
        ? '\\paperw15840\\paperh12240\\landscape\n'
        : '\\paperw12240\\paperh15840\\portrait\n';
    }

    // Titulo de la hoja
    res += '\\pard\\qc\\b\\fs32\\cf1 ' + escRTF('Hoja: ' + hoja.nombre) + '\\b0\\fs' + fs + '\\cf0\\par\n';

    // Portada completa solo en la primera hoja
    if (opciones.portada && esPrimera) {
      const fecha = new Date().toLocaleString('es-AR');
      res += '\\pard\\qc\\fs22\\cf2 ' + escRTF('Archivo: ' + nombreArchivo) + '\\cf0\\par\n';
      res += '\\pard\\qc\\fs22\\cf2 ' + escRTF('Hojas: ' + totalHojas + ' | Generado: ' + fecha) + '\\cf0\\par\n';
      res += '\\pard\\par\n';
    }

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

    // Encabezado
    if (opciones.encabezados) {
      res += defTabla(4);
      for (const h of hoja.encabezados) {
        res += '\\pard\\intbl\\b\\cf3 ' + escRTF(h) + '\\b0\\cf0\\cell ';
      }
      res += '\\row\n';
    }

    // Filas
    for (let i = 0; i < hoja.filas.length; i++) {
      const fila = hoja.filas[i];
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
        const limpio = celda.replace(/[.,\-]/g, '');
        const esNum = limpio !== '' && /^\d+$/.test(limpio);
        res += '\\pard\\intbl' + pb + (esNum ? '\\qr' : '') + ' ' + escRTF(celda) + '\\cell ';
        pb = '';
      }
      res += '\\row\n';
    }

    return res;
  }

  /* --------------------------------------------------------
     Generar RTF completo con todas las hojas
     -------------------------------------------------------- */
  function generarRTFTodas(hojas, opciones, nombreArchivo) {
    const p = PALETAS[opciones.paleta];

    let res = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082\n';
    res += '\\paperw12240\\paperh15840\\margl720\\margr720\\margt720\\margb720\n';
    res += '{\\fonttbl{\\f0 Calibri;}{\\f1 Consolas;}}\n';
    res += '{\\colortbl ;\n';
    res += rtfColor(p.tituloTexto)    + '\n';
    res += rtfColor(p.subtituloTexto) + '\n';
    res += rtfColor(p.headerTexto)    + '\n';
    res += rtfColor(p.headerFondo)    + '\n';
    res += rtfColor(p.filaImpar)      + '\n';
    res += rtfColor(p.borde)          + '\n';
    res += '}\n';
    res += '\\f0\\fs22\n';

    // Titulo general
    res += '\\pard\\qc\\b\\fs40\\cf1 ' + escRTF('PYM Util - ' + nombreArchivo) + '\\b0\\fs22\\cf0\\par\n';

    for (let i = 0; i < hojas.length; i++) {
      res += generarRTFHoja(hojas[i], opciones, p, i === 0, nombreArchivo, hojas.length);
    }

    res += '\\pard\n}\n';
    return res;
  }

  /* --------------------------------------------------------
     Modal
     -------------------------------------------------------- */
  function abrirModal(file, hojas) {
    const infoHojas = hojas.map(h =>
      '<li><b>' + UI.esc(h.nombre) + '</b> - ' + h.encabezados.length + ' cols, ' + h.filas.length + ' filas</li>'
    ).join('');

    const base = file.name.replace(/\.[^.]+$/, '');

    const html = `
      <div class="pym-c2r-info">
        <b>Archivo:</b> ${UI.esc(file.name)} &nbsp;|&nbsp;
        <b>Hojas:</b> ${hojas.length}
      </div>

      <div class="pym-c2r-layout">
        <div class="pym-c2r-izq">
          <h4>Hojas detectadas</h4>
          <ul class="pym-x2r-hojas">${infoHojas}</ul>
        </div>

        <div class="pym-c2r-der">
          <h4>Opciones</h4>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-portada" checked> Portada / encabezado</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-encab" checked> Encabezados de tabla</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-numerar"> Numerar filas</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-zebra" checked> Filas alternadas (zebra)</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-colores" checked> Usar colores</label>
          <label class="pym-c2r-opt"><input type="checkbox" id="x2r-paginar" checked> Salto de pagina cada 40 filas</label>

          <h4 style="margin-top:14px;">Paleta</h4>
          <select id="x2r-paleta" style="width:100%;padding:6px;border:1px solid #a0c8a0;border-radius:6px;">
            <option value="0">Verde PYM</option>
            <option value="1">Gris (impresion)</option>
          </select>

          <h4 style="margin-top:14px;">Archivo de salida</h4>
          <input type="text" id="x2r-nombre" value="${UI.esc(base)}.rtf"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">
        </div>
      </div>

      <div class="pym-exp-estado" id="x2r-estado">Listo. Configura y pulsa Convertir.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '15) XLSX -> RTF',
      ancho: 800,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Convertir a RTF', onClick: (v) => convertir(v, hojas, file.name) }
      ]
    });
  }

  function convertir(v, hojas, nombreArchivo) {
    const opciones = {
      portada:    v.cuerpo.querySelector('#x2r-portada').checked,
      encabezados: v.cuerpo.querySelector('#x2r-encab').checked,
      numerar:    v.cuerpo.querySelector('#x2r-numerar').checked,
      zebra:      v.cuerpo.querySelector('#x2r-zebra').checked,
      colores:    v.cuerpo.querySelector('#x2r-colores').checked,
      paginar:    v.cuerpo.querySelector('#x2r-paginar').checked,
      paleta:     parseInt(v.cuerpo.querySelector('#x2r-paleta').value, 10)
    };

    const nombre = v.cuerpo.querySelector('#x2r-nombre').value || 'salida.rtf';

    let rtf;
    try {
      rtf = generarRTFTodas(hojas, opciones, nombreArchivo);
    } catch (e) {
      UI.toast('Error al generar RTF: ' + e.message, 'error');
      return;
    }

    UI.descargar(nombre, rtf, 'application/rtf');
    UI.toast('RTF generado: ' + nombre);
    v.cuerpo.querySelector('#x2r-estado').textContent = 'Exportado: ' + nombre;
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  async function ejecutar() {
    const file = await UI.pedirArchivo('.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      UI.toast('SheetJS no esta cargado', 'error');
      return;
    }

    let hojas;
    try {
      const buffer = await file.arrayBuffer();
      hojas = leerXLSX(buffer);
    } catch (e) {
      UI.toast('Error al leer XLSX: ' + e.message, 'error');
      return;
    }

    if (hojas.length === 0) {
      UI.toast('El archivo no tiene hojas', 'error');
      return;
    }

    abrirModal(file, hojas);
  }

  return { ejecutar };

})();
