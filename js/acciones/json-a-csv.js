/* ============================================================
   Acción: JSON â†’ CSV
   ============================================================ */

const ACCION_JSON_A_CSV = (() => {

  function escaparCampo(v, sep) {
    const s = String(v ?? '');
    if (s.includes(sep) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function valorATexto(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }

  function generarCSV(objeto, arrayNombre, sep, conEncab) {
    let arr = objeto;
    if (!Array.isArray(arr)) {
      if (!arrayNombre) throw new Error('La raíz es un objeto. Elegí un array interno.');
      arr = objeto[arrayNombre];
      if (!Array.isArray(arr)) throw new Error(`"${arrayNombre}" no es un array.`);
    }
    if (arr.length === 0) throw new Error('Array vacío.');
    if (typeof arr[0] !== 'object' || arr[0] === null) {
      throw new Error('Los elementos del array no son objetos.');
    }

    // Columnas = unión de claves de todos los objetos
    const cols = [];
    const vistas = new Set();
    for (const el of arr) {
      if (el && typeof el === 'object') {
        for (const k of Object.keys(el)) {
          if (!vistas.has(k)) { vistas.add(k); cols.push(k); }
        }
      }
    }

    const lineas = [];
    if (conEncab) {
      lineas.push(cols.map(c => escaparCampo(c, sep)).join(sep));
    }
    for (const el of arr) {
      const fila = cols.map(c => escaparCampo(valorATexto(el?.[c]), sep));
      lineas.push(fila.join(sep));
    }
    // BOM UTF-8 para Excel
    return '\uFEFF' + lineas.join('\r\n');
  }

  // Detectar arrays internos
  function arraysInternos(objeto) {
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) return [];
    return Object.keys(objeto).filter(k => Array.isArray(objeto[k]));
  }

  async function ejecutar() {
    if (!ESTADO.hayJSON()) {
      UI.toast('Primero cargá un JSON', 'error');
      return;
    }

    const obj = ESTADO.datos.objetoJSON;
    const esArray = Array.isArray(obj);
    const arrays = esArray ? [] : arraysInternos(obj);

    if (!esArray && arrays.length === 0) {
      UI.toast('La raíz no es array y no hay arrays internos', 'error');
      return;
    }

    const opcionesArray = esArray
      ? '<option value="">(raíz)</option>'
      : arrays.map(a => `<option value="${UI.esc(a)}">${UI.esc(a)}</option>`).join('');

    const html = `
      ${!esArray ? `
        <div class="pym-campo">
          <label>Array a exportar</label>
          <select id="j2c-array">${opcionesArray}</select>
        </div>
      ` : ''}
      <div class="pym-campo">
        <label>Separador</label>
        <select id="j2c-sep">
          <option value=";">Punto y coma ( ; ) â€” Excel ES</option>
          <option value=",">Coma ( , ) â€” Internacional</option>
          <option value="\t">Tabulador</option>
        </select>
      </div>
      <div class="pym-campo">
        <label>
          <input type="checkbox" id="j2c-encab" checked> Incluir encabezados
        </label>
      </div>
      <div class="pym-campo">
        <label>Nombre del archivo de salida</label>
        <input type="text" id="j2c-nombre"
               value="${UI.esc((ESTADO.datos.rutaJSON || 'salida').replace(/\.json$/i, '') + '.csv')}">
      </div>
    `;

    const v = VENTANA.abrir({
      titulo: '12) JSON â†’ CSV',
      ancho: 520,
      html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: v => v.cerrar() },
        { texto: 'Convertir', onClick: (v) => {
            try {
              const sep = v.cuerpo.querySelector('#j2c-sep').value;
              const conEncab = v.cuerpo.querySelector('#j2c-encab').checked;
              const selArr = v.cuerpo.querySelector('#j2c-array');
              const arrNom = selArr ? selArr.value : '';
              const nombre = v.cuerpo.querySelector('#j2c-nombre').value || 'salida.csv';

              const csv = generarCSV(obj, arrNom, sep, conEncab);
              UI.descargar(nombre, csv, 'text/csv');
              UI.toast('CSV generado: ' + nombre);
              v.cerrar();
            } catch (e) {
              UI.toast('Error: ' + e.message, 'error');
            }
          }
        }
      ]
    });
  }

  return { ejecutar, generarCSV };
})();
