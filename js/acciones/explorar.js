/* ============================================================
   PYM Util - Accion: Explorar JSON
   Archivo: js/acciones/explorar.js
   Muestra 3 pestanas: Estadisticas | Arbol | Claves unicas
   ============================================================ */

const ACCION_EXPLORAR = (() => {

  /* --------------------------------------------------------
     Estado interno del explorador
     -------------------------------------------------------- */
  let contadores = null;
  let claves     = null;

  /* --------------------------------------------------------
     Reset de contadores
     -------------------------------------------------------- */
  function resetContadores() {
    contadores = {
      objetos: 0,
      arrays: 0,
      strings: 0,
      numeros: 0,
      booleanos: 0,
      nulls: 0,
      profundidadMax: 0
    };
    claves = new Map();  // clave -> { veces, tipos: Set }
  }

  /* --------------------------------------------------------
     Recorrido recursivo (llena contadores y claves)
     -------------------------------------------------------- */
  function recorrer(valor, nivel, clave) {
    if (nivel > contadores.profundidadMax) {
      contadores.profundidadMax = nivel;
    }

    if (valor === null) {
      contadores.nulls++;
      return;
    }

    if (Array.isArray(valor)) {
      contadores.arrays++;
      for (let i = 0; i < valor.length; i++) {
        recorrer(valor[i], nivel + 1, clave);
      }
      return;
    }

    const t = typeof valor;

    if (t === 'object') {
      contadores.objetos++;
      const keys = Object.keys(valor);
      for (const k of keys) {
        registrarClave(k, valor[k]);
        recorrer(valor[k], nivel + 1, k);
      }
      return;
    }

    if (t === 'string')  { contadores.strings++;   return; }
    if (t === 'number')  { contadores.numeros++;   return; }
    if (t === 'boolean') { contadores.booleanos++; return; }
    // Cualquier otro tipo raro (undefined, function, symbol)
  }

  /* --------------------------------------------------------
     Registrar una clave en el mapa
     -------------------------------------------------------- */
  function registrarClave(k, valor) {
    if (!claves.has(k)) {
      claves.set(k, { veces: 0, tipos: new Set() });
    }
    const info = claves.get(k);
    info.veces++;

    let tipo = 'otro';
    if (valor === null)              tipo = 'null';
    else if (Array.isArray(valor))   tipo = 'array';
    else                             tipo = typeof valor;
    info.tipos.add(tipo);
  }

  /* --------------------------------------------------------
     Detectar arrays internos en la raiz
     -------------------------------------------------------- */
  function arraysInternos(objeto) {
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) return [];
    return Object.keys(objeto).filter(k => Array.isArray(objeto[k]));
  }

  /* --------------------------------------------------------
     PESTANA 1: Estadisticas
     -------------------------------------------------------- */
  function generarEstadisticas(obj, nombreArchivo, tamanoBytes) {
    const tipoRaiz = Array.isArray(obj)
      ? 'Array'
      : (obj && typeof obj === 'object' ? 'Objeto' : typeof obj);

    const totalNodos =
      contadores.objetos + contadores.arrays +
      contadores.strings + contadores.numeros +
      contadores.booleanos + contadores.nulls;

    const kb = (tamanoBytes / 1024).toFixed(2);

    const lineas = [];
    lineas.push('Archivo: ' + nombreArchivo);
    lineas.push('Tamano: ' + kb + ' KB (' + tamanoBytes + ' bytes)');
    lineas.push('');
    lineas.push('=================  ESTRUCTURA  =================');
    lineas.push('');
    lineas.push('  Tipo raiz:        ' + tipoRaiz);
    lineas.push('  Profundidad max:  ' + contadores.profundidadMax + ' niveles');
    lineas.push('');
    lineas.push('=================  CONTENIDO  ==================');
    lineas.push('');
    lineas.push('  Objetos:          ' + contadores.objetos);
    lineas.push('  Arrays:           ' + contadores.arrays);
    lineas.push('  Strings:          ' + contadores.strings);
    lineas.push('  Numeros:          ' + contadores.numeros);
    lineas.push('  Booleanos:        ' + contadores.booleanos);
    lineas.push('  Nulls:            ' + contadores.nulls);
    lineas.push('');
    lineas.push('  Total de nodos:   ' + totalNodos);
    lineas.push('');

    // Arrays en la raiz (si la raiz es objeto)
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const arrs = arraysInternos(obj);
      if (arrs.length > 0) {
        lineas.push('=================  ARRAYS EN RAIZ  ==============');
        lineas.push('');
        for (const a of arrs) {
          lineas.push('  - ' + a + ' (' + obj[a].length + ' elementos)');
        }
        lineas.push('');
      }
    }

    return lineas.join('\n');
  }

  /* --------------------------------------------------------
     PESTANA 2: Arbol (devuelve HTML)
     -------------------------------------------------------- */
  function generarArbol(obj) {
    // Genera un arbol HTML usando <ul> anidados
    function render(valor, clave, nivel) {
      const indent = '  '.repeat(nivel);
      const etiqueta = clave ? clave + ': ' : '';

      if (valor === null) {
        return indent + etiqueta + 'null';
      }
      if (Array.isArray(valor)) {
        let s = indent + etiqueta + '[ ] array (' + valor.length + ' elementos)\n';
        const max = Math.min(valor.length, 100);
        for (let i = 0; i < max; i++) {
          s += render(valor[i], '[' + i + ']', nivel + 1) + '\n';
        }
        if (valor.length > max) {
          s += indent + '  ... +' + (valor.length - max) + ' mas\n';
        }
        return s;
      }
      if (typeof valor === 'object') {
        const keys = Object.keys(valor);
        let s = indent + etiqueta + '{ } objeto (' + keys.length + ' claves)\n';
        for (const k of keys) {
          s += render(valor[k], k, nivel + 1) + '\n';
        }
        return s;
      }
      if (typeof valor === 'string') {
        let v = valor;
        if (v.length > 80) v = v.slice(0, 77) + '...';
        return indent + etiqueta + '"' + v + '"';
      }
      // number, boolean
      return indent + etiqueta + String(valor);
    }

    // Limitar a las primeras 2000 lineas para no colgar el navegador
    const completo = render(obj, '', 0);
    const lineas = completo.split('\n');
    if (lineas.length > 2000) {
      return lineas.slice(0, 2000).join('\n') +
             '\n\n... (arbol truncado a 2000 lineas)';
    }
    return completo;
  }

  /* --------------------------------------------------------
     PESTANA 3: Claves unicas
     -------------------------------------------------------- */
  function generarClaves() {
    const arr = [];
    claves.forEach((info, clave) => {
      arr.push({
        clave: clave,
        veces: info.veces,
        tipos: Array.from(info.tipos).sort().join(', ')
      });
    });

    // Ordenar alfabeticamente
    arr.sort((a, b) => a.clave.localeCompare(b.clave));

    const lineas = [];
    lineas.push('Claves unicas encontradas: ' + arr.length);
    lineas.push('');
    lineas.push('==========================================================');
    lineas.push('  Clave                          Veces    Tipos');
    lineas.push('==========================================================');

    for (const c of arr) {
      const clav = c.clave.length > 30 ? c.clave.slice(0, 27) + '...' : c.clave;
      lineas.push(
        '  ' +
        clav.padEnd(30, ' ') + ' ' +
        String(c.veces).padStart(5, ' ') + '   ' +
        c.tipos
      );
    }

    return lineas.join('\n');
  }

  /* --------------------------------------------------------
     Ejecutar la accion
     -------------------------------------------------------- */
  async function ejecutar() {
    // 1) Verificar que hay JSON cargado
    if (!ESTADO.hayJSON()) {
      UI.toast('Primero carga un JSON', 'error');
      return;
    }

    const obj = ESTADO.datos.objetoJSON;
    const nombreArchivo = ESTADO.datos.rutaJSON || 'archivo.json';
    const tamanoBytes = ESTADO.datos.textoJSON
      ? new Blob([ESTADO.datos.textoJSON]).size
      : 0;

    // 2) Analizar
    UI.toast('Analizando JSON...', 'info', 1000);
    resetContadores();
    recorrer(obj, 1, '');

    // 3) Generar contenido de las 3 pestanas
    const txtEstadisticas = generarEstadisticas(obj, nombreArchivo, tamanoBytes);
    const txtArbol        = generarArbol(obj);
    const txtClaves       = generarClaves();

    // 4) Armar HTML del modal
    const html = `
      <div class="pym-tabs">
        <div class="pym-tabs-botones">
          <button class="pym-tab-btn activo" data-tab="est">Estadisticas</button>
          <button class="pym-tab-btn" data-tab="arbol">Arbol</button>
          <button class="pym-tab-btn" data-tab="claves">Claves unicas</button>
        </div>
        <div class="pym-tabs-cuerpos">
          <pre class="pym-tab-cuerpo activo" data-tab="est"></pre>
          <pre class="pym-tab-cuerpo" data-tab="arbol"></pre>
          <pre class="pym-tab-cuerpo" data-tab="claves"></pre>
        </div>
      </div>
      <div class="pym-exp-info">
        <strong>${UI.esc(nombreArchivo)}</strong>
        &nbsp;|&nbsp;
        ${contadores.profundidadMax} niveles
        &nbsp;|&nbsp;
        ${claves.size} claves unicas
      </div>
    `;

    // 5) Abrir modal
    const v = VENTANA.abrir({
      titulo: '6) Explorar JSON',
      ancho: 900,
      html: html,
      botones: [
        { texto: 'Copiar pestana', clase: 'secundario', onClick: (v) => copiarPestana(v) },
        { texto: 'Cerrar', onClick: (v) => v.cerrar() }
      ]
    });

    // 6) Rellenar contenido en cada <pre>
    v.cuerpo.querySelector('pre[data-tab="est"]').textContent    = txtEstadisticas;
    v.cuerpo.querySelector('pre[data-tab="arbol"]').textContent  = txtArbol;
    v.cuerpo.querySelector('pre[data-tab="claves"]').textContent = txtClaves;

    // 7) Handlers de pestanas
    const botones = v.cuerpo.querySelectorAll('.pym-tab-btn');
    const cuerpos = v.cuerpo.querySelectorAll('.pym-tab-cuerpo');

    botones.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        botones.forEach(b => b.classList.toggle('activo', b === btn));
        cuerpos.forEach(c => c.classList.toggle('activo', c.dataset.tab === tab));
      });
    });
  }

  /* --------------------------------------------------------
     Copiar la pestana activa al portapapeles
     -------------------------------------------------------- */
  function copiarPestana(v) {
    const activo = v.cuerpo.querySelector('.pym-tab-cuerpo.activo');
    if (!activo) return;
    const texto = activo.textContent;
    if (!texto) return;

    navigator.clipboard.writeText(texto).then(
      () => UI.toast('Copiado al portapapeles'),
      () => UI.toast('No se pudo copiar', 'error')
    );
  }

  /* --------------------------------------------------------
     API publica
     -------------------------------------------------------- */
  return { ejecutar };

})();
