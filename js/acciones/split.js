/* ============================================================
   Acción: Cortar JSON en partes
   ============================================================ */

const ACCION_SPLIT = (() => {

  function arraysInternos(objeto) {
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) return [];
    return Object.keys(objeto).filter(k => Array.isArray(objeto[k]));
  }

  function nombreParte(prefijo, n) {
    return `${prefijo}_parte_${String(n).padStart(2, '0')}.json`;
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
      UI.toast('No hay arrays para cortar', 'error');
      return;
    }

    const opcionesArray = esArray
      ? '<option value="">(raíz)</option>'
      : arrays.map(a => `<option value="${UI.esc(a)}">${UI.esc(a)}</option>`).join('');

    const base = (ESTADO.datos.rutaJSON || 'salida').replace(/\.json$/i, '');

    const html = `
      <div class="pym-campo">
        <label>Array a cortar</label>
        <select id="sp-array">${opcionesArray}</select>
      </div>
      <div class="pym-campo">
        <label>Modo de corte</label>
        <select id="sp-modo">
          <option value="elems">Por cantidad de elementos</option>
          <option value="peso">Por peso máximo (KB)</option>
          <option value="npartes">En N partes iguales</option>
        </select>
      </div>
      <div class="pym-campo">
        <label>Elementos por parte</label>
        <input type="number" id="sp-elems" value="100" min="1">
      </div>
      <div class="pym-campo">
        <label>Peso máximo por parte (KB)</label>
        <input type="number" id="sp-peso" value="500" min="1">
      </div>
      <div class="pym-campo">
        <label>Cantidad de partes iguales</label>
        <input type="number" id="sp-npartes" value="5" min="2">
      </div>
      <div class="pym-campo">
        <label>Prefijo de los archivos</label>
        <input type="text" id="sp-prefijo" value="${UI.esc(base)}">
      </div>
      <div class="pym-estado" id="sp-info">Listo. Configurá y pulsá Procesar.</div>
    `;

    VENTANA.abrir({
      titulo: '10) Cortar JSON en partes',
      ancho: 560,
      html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: v => v.cerrar() },
        { texto: 'Procesar', onClick: async (v) => {
            const arraySel = v.cuerpo.querySelector('#sp-array')?.value || '';
            const modo     = v.cuerpo.querySelector('#sp-modo').value;
            const elems    = parseInt(v.cuerpo.querySelector('#sp-elems').value, 10) || 1;
            const pesoKB   = parseInt(v.cuerpo.querySelector('#sp-peso').value, 10) || 500;
            const nPartes  = parseInt(v.cuerpo.querySelector('#sp-npartes').value, 10) || 5;
            const prefijo  = v.cuerpo.querySelector('#sp-prefijo').value || 'parte';
            const info     = v.cuerpo.querySelector('#sp-info');

            let arr = obj;
            if (!Array.isArray(arr)) arr = obj[arraySel];
            if (!Array.isArray(arr) || arr.length === 0) {
              info.textContent = 'Array vacío o inválido.';
              return;
            }

            info.textContent = 'Procesando ' + arr.length + ' elementosâ€¦';

            // Calcular particiones
            const partes = [];
            let actual = [];
            let pesoActual = 0;

            if (modo === 'npartes') {
              const tam = Math.ceil(arr.length / nPartes);
              for (let i = 0; i < arr.length; i += tam) {
                partes.push(arr.slice(i, i + tam));
              }
            } else if (modo === 'elems') {
              for (let i = 0; i < arr.length; i += elems) {
                partes.push(arr.slice(i, i + elems));
              }
            } else {
              const lim = pesoKB * 1024;
              for (const el of arr) {
                const p = new Blob([JSON.stringify(el)]).size + 2;
                if (pesoActual > 0 && pesoActual + p > lim) {
                  partes.push(actual); actual = []; pesoActual = 0;
                }
                actual.push(el);
                pesoActual += p;
              }
              if (actual.length) partes.push(actual);
            }

            // Generar cada archivo
            for (let i = 0; i < partes.length; i++) {
              const nombre = nombreParte(prefijo, i + 1);
              let contenido;
              if (esArray) {
                contenido = JSON.stringify(partes[i], null, 2);
              } else {
                contenido = JSON.stringify({ [arraySel]: partes[i] }, null, 2);
              }
              // pequeño delay para que el navegador no bloquee
              await new Promise(r => setTimeout(r, 30));
              UI.descargar(nombre, contenido, 'application/json');
            }

            info.textContent = `OK. ${partes.length} archivos generados.`;
            UI.toast(`Split: ${partes.length} partes generadas`);
          }
        }
      ]
    });
  }

  return { ejecutar };
})();
