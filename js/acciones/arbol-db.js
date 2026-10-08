/* ============================================================
   PYM Util - Accion: Arbol DB
   Archivo: js/acciones/arbol-db.js

   Muestra un arbol jerarquico de las tablas (usando "__").
   Cada tabla muestra sus columnas con tipo y flags (PK, NN).
   Click en una tabla -> preview de las primeras filas.
   ============================================================ */

const ACCION_ARBOL_DB = (() => {

  /* --------------------------------------------------------
     Listar tablas
     -------------------------------------------------------- */
  function listarTablas() {
    return SQLITE.consultar(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).map(r => r.name);
  }

  /* --------------------------------------------------------
     Columnas de una tabla
     -------------------------------------------------------- */
  function listarColumnas(tabla) {
    return SQLITE.consultar('PRAGMA table_info(' + tabla + ')').map(c => ({
      nombre: c.name,
      tipo: c.type || '',
      pk: c.pk === 1,
      notnull: c.notnull === 1
    }));
  }

  /* --------------------------------------------------------
     Contar filas
     -------------------------------------------------------- */
  function contarFilas(tabla) {
    const res = SQLITE.consultar('SELECT COUNT(*) AS n FROM ' + tabla);
    return res.length > 0 ? res[0].n : 0;
  }

  /* --------------------------------------------------------
     Detectar padre por "__"
     -------------------------------------------------------- */
  function nombrePadre(tabla) {
    const idx = tabla.indexOf('__');
    return idx > 0 ? tabla.slice(0, idx) : '';
  }

  /* --------------------------------------------------------
     Construir estructura jerarquica
     -------------------------------------------------------- */
  function construirArbol(tablas) {
    // Cada nodo tiene: { nombre, hijos: [], raiz: bool }
    const mapa = new Map();

    for (const t of tablas) {
      mapa.set(t, { nombre: t, hijos: [], padre: nombrePadre(t) });
    }

    const raices = [];
    for (const t of tablas) {
      const nodo = mapa.get(t);
      if (nodo.padre === '') {
        raices.push(nodo);
      } else {
        // Puede pasar que el padre no exista (por ejemplo, si el nombre
        // usa "__" pero no es una relacion real). En ese caso lo tratamos como raiz.
        if (mapa.has(nodo.padre)) {
          mapa.get(nodo.padre).hijos.push(nodo);
        } else {
          raices.push(nodo);
        }
      }
    }

    return raices;
  }

  /* --------------------------------------------------------
     Preview de una tabla
     -------------------------------------------------------- */
  function mostrarPreview(tabla) {
    const info = document.getElementById('arb-info');
    const cont = document.getElementById('arb-preview');

    if (!cont) return;

    try {
      const filas = SQLITE.consultar('SELECT * FROM ' + tabla + ' LIMIT 100');
      const cols = listarColumnas(tabla);

      if (filas.length === 0) {
        cont.innerHTML = '<p style="padding:12px;">La tabla esta vacia.</p>';
        if (info) info.textContent = 'Tabla: ' + tabla + ' | 0 filas';
        return;
      }

      const cab = cols.map(c => '<th>' + UI.esc(c.nombre) + '</th>').join('');
      const cuerpo = filas.map(f => {
        const celdas = cols.map(c => {
          const v = f[c.nombre];
          const txt = v === null ? '' : String(v);
          const corto = txt.length > 60 ? txt.slice(0, 57) + '...' : txt;
          return '<td title="' + UI.esc(txt) + '">' + UI.esc(corto) + '</td>';
        }).join('');
        return '<tr>' + celdas + '</tr>';
      }).join('');

      cont.innerHTML =
        '<table class="pym-tabla">' +
        '<thead><tr>' + cab + '</tr></thead>' +
        '<tbody>' + cuerpo + '</tbody>' +
        '</table>';

      if (info) {
        const total = contarFilas(tabla);
        info.textContent = 'Tabla: ' + tabla + ' | ' + filas.length + ' / ' + total + ' filas | ' + cols.length + ' columnas';
      }
    } catch (e) {
      cont.innerHTML = '<p style="padding:12px;color:#c62828;">Error: ' + UI.esc(e.message) + '</p>';
    }
  }

  /* --------------------------------------------------------
     Render del arbol como HTML
     -------------------------------------------------------- */
  function renderNodo(nodo, nivel) {
    const cols = listarColumnas(nodo.nombre);
    const filas = contarFilas(nodo.nombre);

    let html = '';

    // Encabezado de tabla
    html += '<div class="pym-arb-tabla" data-tabla="' + UI.esc(nodo.nombre) + '" style="padding-left:' + (nivel * 20) + 'px;">';
    html += '<span class="pym-arb-icono">[T]</span> ';
    html += '<b>' + UI.esc(nodo.nombre) + '</b>';
    html += ' <small>(' + filas + ' filas)</small>';
    html += '</div>';

    // Columnas
    html += '<div class="pym-arb-cols" style="padding-left:' + ((nivel + 1) * 20) + 'px;">';
    for (const c of cols) {
      let txt = '- ' + UI.esc(c.nombre);
      if (c.tipo) txt += ' (' + UI.esc(c.tipo) + ')';
      if (c.pk) txt += ' [PK]';
      if (c.notnull) txt += ' [NN]';
      html += '<div class="pym-arb-col">' + txt + '</div>';
    }
    html += '</div>';

    // Hijos
    for (const h of nodo.hijos) {
      html += renderNodo(h, nivel + 1);
    }

    return html;
  }

  /* --------------------------------------------------------
     Abrir modal
     -------------------------------------------------------- */
  function abrir() {
    if (!SQLITE.db) {
      UI.toast('No hay base de datos abierta', 'error');
      return;
    }

    const tablas = listarTablas();
    if (tablas.length === 0) {
      UI.toast('La base de datos no tiene tablas', 'error');
      return;
    }

    const raices = construirArbol(tablas);

    const arbolHTML = raices.map(r => renderNodo(r, 0)).join('');

    const html = `
      <div class="pym-arb-layout">
        <div class="pym-arb-izq">
          <div class="pym-arb-arbol">${arbolHTML}</div>
        </div>
        <div class="pym-arb-der">
          <div class="pym-arb-info" id="arb-info">Selecciona una tabla para ver su contenido.</div>
          <div class="pym-arb-preview" id="arb-preview"></div>
        </div>
      </div>
    `;

    const v = VENTANA.abrir({
      titulo: '8) Arbol DB',
      ancho: 1100,
      html: html,
      botones: [
        { texto: 'Cerrar', onClick: (v) => v.cerrar() }
      ]
    });

    // Handlers: click en tabla -> preview
    v.cuerpo.querySelectorAll('.pym-arb-tabla').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        // Quitar seleccion anterior
        v.cuerpo.querySelectorAll('.pym-arb-tabla').forEach(e => e.classList.remove('activo'));
        el.classList.add('activo');
        mostrarPreview(el.dataset.tabla);
      });
    });

    // Auto-seleccionar la primera tabla
    const primerTabla = v.cuerpo.querySelector('.pym-arb-tabla');
    if (primerTabla) {
      primerTabla.classList.add('activo');
      mostrarPreview(primerTabla.dataset.tabla);
    }
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  async function ejecutar() {
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
