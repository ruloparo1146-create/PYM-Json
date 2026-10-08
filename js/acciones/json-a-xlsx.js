/* ============================================================
   PYM Util - Accion: JSON -> XLSX
   Archivo: js/acciones/json-a-xlsx.js

   Convierte un JSON a un archivo XLSX real con SheetJS.
   Multiples hojas: una por cada array/objeto de la raiz.
   ============================================================ */

const ACCION_JSON_A_XLSX = (() => {

  /* --------------------------------------------------------
     Utilidades
     -------------------------------------------------------- */

  // Nombre de hoja valido para Excel (max 31 chars, sin : \ / ? * [ ])
  function sanearNombreHoja(n) {
    let s = String(n || 'Hoja');
    s = s.replace(/[:\\\/\?\*\[\]]/g, '_').trim();
    if (s === '') s = 'Hoja';
    if (s.length > 31) s = s.slice(0, 31);
    return s;
  }

  // Serializa un valor JSON a texto plano
  function valorATexto(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }

  // Recolecta las claves unicas de un array de objetos
  function recolectarClaves(arr) {
    const set = new Set();
    for (const el of arr) {
      if (el && typeof el === 'object' && !Array.isArray(el)) {
        for (const k of Object.keys(el)) set.add(k);
      }
    }
    return Array.from(set);
  }

  /* --------------------------------------------------------
     Detectar elementos exportables en la raiz
     -------------------------------------------------------- */
  function detectarHojas(obj) {
    const hojas = [];

    if (Array.isArray(obj)) {
      hojas.push({ clave: '(raiz)', esArray: true, datos: obj });
      return hojas;
    }

    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v)) {
          hojas.push({ clave: k, esArray: true, datos: v });
        } else if (v && typeof v === 'object') {
          hojas.push({ clave: k, esArray: false, datos: v });
        }
      }
    }
    return hojas;
  }

  /* --------------------------------------------------------
     Convertir una hoja a AOA (array of arrays)
     -------------------------------------------------------- */
  function hojaAAOA(hoja, conEncab) {
    const { esArray, datos } = hoja;
    const aoa = [];

    if (esArray) {
      if (datos.length === 0) return [['(vacio)']];
      const prim = datos[0];

      if (prim && typeof prim === 'object' && !Array.isArray(prim)) {
        // Array de objetos: columnas = union de claves
        const cols = recolectarClaves(datos);
        if (conEncab) aoa.push(cols);

        for (const el of datos) {
          const fila = cols.map(c => valorATexto(el?.[c]));
          aoa.push(fila);
        }
      } else {
        // Array de escalares
        if (conEncab) aoa.push(['valor']);
        for (const el of datos) {
          aoa.push([valorATexto(el)]);
        }
      }
    } else {
      // Objeto unico: una sola fila con las claves como columnas
      const cols = Object.keys(datos);
      if (conEncab) aoa.push(cols);

      const fila = cols.map(c => valorATexto(datos[c]));
      aoa.push(fila);
    }

    return aoa;
  }

  /* --------------------------------------------------------
     Abrir modal
     -------------------------------------------------------- */
  function abrirModal() {
    const obj = ESTADO.datos.objetoJSON;
    const hojas = detectarHojas(obj);

    if (hojas.length === 0) {
      UI.toast('El JSON no tiene arrays ni objetos para exportar', 'error');
      return;
    }

    const opcionesHojas = hojas.map((h, i) =>
      '<label class="pym-exp-col">' +
      '<input type="checkbox" data-hoja="' + i + '" checked> ' +
      UI.esc(h.clave) + ' (' + (h.esArray ? h.datos.length + ' filas' : 'objeto unico') + ')' +
      '</label>'
    ).join('');

    const base = (ESTADO.datos.rutaJSON || 'salida').replace(/\.[^.]+$/, '');

    const html = `
      <div class="pym-exp-layout">
        <div class="pym-exp-izq">
          <h4>Hojas a exportar</h4>
          <div class="pym-exp-cols">${opcionesHojas}</div>
          <button id="xlsx-todas" class="pym-btn-mini">Marcar todas</button>
          <button id="xlsx-ninguna" class="pym-btn-mini secundario">Desmarcar todas</button>
        </div>
        <div class="pym-exp-der">
          <h4>Opciones</h4>
          <div class="pym-exp-opts">
            <label><input type="checkbox" id="xlsx-encab" checked> Incluir encabezados</label>
          </div>
          <h4 style="margin-top:12px;">Nombre del archivo</h4>
          <input type="text" id="xlsx-nombre" value="${UI.esc(base)}.xlsx"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">
        </div>
      </div>
      <div class="pym-exp-estado" id="xlsx-estado">Listo. Configura y pulsa Exportar.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '13) JSON -> XLSX',
      ancho: 700,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Exportar', onClick: (v) => ejecutarExport(v, hojas) }
      ]
    });

    v.cuerpo.querySelector('#xlsx-todas').addEventListener('click', () => {
      v.cuerpo.querySelectorAll('.pym-exp-col input').forEach(c => c.checked = true);
    });
    v.cuerpo.querySelector('#xlsx-ninguna').addEventListener('click', () => {
      v.cuerpo.querySelectorAll('.pym-exp-col input').forEach(c => c.checked = false);
    });
  }

  /* --------------------------------------------------------
     Exportar
     -------------------------------------------------------- */
  function ejecutarExport(v, hojas) {
    if (typeof XLSX === 'undefined') {
      UI.toast('SheetJS no esta cargado. Verifica el <script> en el HTML.', 'error');
      return;
    }

    const seleccionadas = [];
    v.cuerpo.querySelectorAll('.pym-exp-col input:checked').forEach(c => {
      seleccionadas.push(hojas[parseInt(c.dataset.hoja, 10)]);
    });

    if (seleccionadas.length === 0) {
      UI.toast('Marca al menos una hoja', 'error');
      return;
    }

    const conEncab = v.cuerpo.querySelector('#xlsx-encab').checked;
    const nombre = v.cuerpo.querySelector('#xlsx-nombre').value || 'salida.xlsx';

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const nombresUsados = new Set();

    for (const h of seleccionadas) {
      const aoa = hojaAAOA(h, conEncab);
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Nombre unico
      let nombreHoja = sanearNombreHoja(h.clave);
      let sufijo = 2;
      while (nombresUsados.has(nombreHoja.toLowerCase())) {
        nombreHoja = sanearNombreHoja(h.clave).slice(0, 28) + '_' + sufijo;
        sufijo++;
      }
      nombresUsados.add(nombreHoja.toLowerCase());

      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    }

    try {
      XLSX.writeFile(wb, nombre);
      UI.toast('XLSX generado: ' + nombre);
      v.cuerpo.querySelector('#xlsx-estado').textContent = 'Exportado: ' + nombre;
    } catch (e) {
      console.error(e);
      UI.toast('Error al generar XLSX: ' + e.message, 'error');
    }
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  function ejecutar() {
    if (!ESTADO.hayJSON()) {
      UI.toast('Primero carga un JSON', 'error');
      return;
    }
    abrirModal();
  }

  return { ejecutar };

})();
