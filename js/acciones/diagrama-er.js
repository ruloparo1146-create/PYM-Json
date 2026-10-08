/* ============================================================
   PYM Util - Accion: Diagrama ER
   Archivo: js/acciones/diagrama-er.js

   Dibuja un diagrama Entidad-Relacion en SVG con:
   - Cajas para cada tabla (titulo + columnas)
   - Lineas conectando tablas hijas con su padre
   - Zoom y paneo (drag)
   ============================================================ */

const ACCION_DIAGRAMA_ER = (() => {

  let contenedorSVG = null;
  let zoom = 1;
  let offX = 20;
  let offY = 20;
  let dragActivo = false;
  let dragX0 = 0;
  let dragY0 = 0;
  let cajas = [];    // { tabla, padre, x, y, w, h, cols, filas }

  /* --------------------------------------------------------
     Listar tablas y columnas
     -------------------------------------------------------- */
  function listarTablas() {
    return SQLITE.consultar(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).map(r => r.name);
  }

  function listarColumnas(tabla) {
    return SQLITE.consultar('PRAGMA table_info(' + tabla + ')').map(c => c.name);
  }

  function contarFilas(tabla) {
    const res = SQLITE.consultar('SELECT COUNT(*) AS n FROM ' + tabla);
    return res.length > 0 ? res[0].n : 0;
  }

  function nombrePadre(tabla) {
    const idx = tabla.indexOf('__');
    return idx > 0 ? tabla.slice(0, idx) : '';
  }

  /* --------------------------------------------------------
     Preparar cajas con auto-layout
     -------------------------------------------------------- */
  function prepararCajas() {
    cajas = [];
    const tablas = listarTablas();

    for (const t of tablas) {
      const cols = listarColumnas(t);
      const filas = contarFilas(t);
      cajas.push({
        tabla: t,
        padre: nombrePadre(t),
        cols: cols,
        filas: filas,
        x: 0, y: 0,
        w: 260,
        h: 50 + Math.min(cols.length, 12) * 18
      });
    }

    // Auto-layout: 3 columnas
    const porFila = 3;
    for (let i = 0; i < cajas.length; i++) {
      const col = i % porFila;
      const fila = Math.floor(i / porFila);
      cajas[i].x = 20 + col * 320;
      cajas[i].y = 20 + fila * 300;
    }
  }

  /* --------------------------------------------------------
     Dibujar SVG
     -------------------------------------------------------- */
  function dibujar() {
    if (!contenedorSVG) return;
    const c = contenedorSVG;

    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
    svg += 'width="100%" height="100%" ';
    svg += 'style="background:#f0fff0; cursor:' + (dragActivo ? 'grabbing' : 'grab') + ';">';

    // Estilo de cajas y lineas
    svg += '<defs><marker id="flecha" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">';
    svg += '<polygon points="0 0, 10 3, 0 6" fill="#408040"/></marker></defs>';

    // ---- Lineas (debajo de las cajas) ----
    for (const caja of cajas) {
      if (!caja.padre) continue;
      const padre = cajas.find(x => x.tabla === caja.padre);
      if (!padre) continue;

      const x1 = offX + (padre.x + padre.w / 2) * zoom;
      const y1 = offY + (padre.y + padre.h) * zoom;
      const x2 = offX + (caja.x + caja.w / 2) * zoom;
      const y2 = offY + caja.y * zoom;
      const midY = (y1 + y2) / 2;

      svg += '<polyline points="' + x1 + ',' + y1 + ' ' + x1 + ',' + midY + ' ' + x2 + ',' + midY + ' ' + x2 + ',' + y2 + '" ';
      svg += 'fill="none" stroke="#408040" stroke-width="1.5" marker-end="url(#flecha)"/>';
    }

    // ---- Cajas ----
    for (const caja of cajas) {
      const bx = offX + caja.x * zoom;
      const by = offY + caja.y * zoom;
      const bw = caja.w * zoom;
      const bh = caja.h * zoom;

      // Sombra
      svg += '<rect x="' + (bx + 3) + '" y="' + (by + 3) + '" width="' + bw + '" height="' + bh + '" fill="#b0b0b0" opacity="0.4"/>';

      // Caja
      const esRaiz = caja.padre === '';
      const fondo = esRaiz ? '#e8ffe8' : '#ffffe8';
      svg += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" ';
      svg += 'fill="' + fondo + '" stroke="#206020" stroke-width="1.5" rx="4"/>';

      // Header
      svg += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + (22 * zoom) + '" ';
      svg += 'fill="#409040" rx="4"/>';
      svg += '<rect x="' + bx + '" y="' + (by + 18 * zoom) + '" width="' + bw + '" height="' + (4 * zoom) + '" fill="#409040"/>';

      const titulo = caja.tabla.length > 28 ? caja.tabla.slice(0, 27) + '...' : caja.tabla;
      svg += '<text x="' + (bx + 6) + '" y="' + (by + 15 * zoom) + '" ';
      svg += 'fill="#fff" font-size="' + (12 * zoom) + '" font-weight="bold" font-family="Segoe UI, Arial">';
      svg += escXML(titulo) + '</text>';

      // Info: filas y cols
      svg += '<text x="' + (bx + 6) + '" y="' + (by + 34 * zoom) + '" ';
      svg += 'fill="#404040" font-size="' + (10 * zoom) + '" font-family="Consolas, monospace">';
      svg += caja.filas + ' filas | ' + caja.cols.length + ' cols</text>';

      // Columnas (max 12)
      const maxVer = 12;
      const nCols = Math.min(caja.cols.length, maxVer);
      for (let i = 0; i < nCols; i++) {
        const col = caja.cols[i];
        const corta = col.length > 30 ? col.slice(0, 27) + '...' : col;
        svg += '<text x="' + (bx + 10) + '" y="' + (by + (50 + i * 16) * zoom) + '" ';
        svg += 'fill="#303030" font-size="' + (10 * zoom) + '" font-family="Consolas, monospace">';
        svg += escXML(corta) + '</text>';
      }
      if (caja.cols.length > maxVer) {
        svg += '<text x="' + (bx + 10) + '" y="' + (by + (50 + maxVer * 16) * zoom) + '" ';
        svg += 'fill="#808080" font-size="' + (10 * zoom) + '" font-family="Consolas, monospace">';
        svg += '... +' + (caja.cols.length - maxVer) + ' mas</text>';
      }
    }

    svg += '</svg>';
    contenedorSVG.innerHTML = svg;

    // Handlers de paneo
    const svgEl = contenedorSVG.querySelector('svg');
    if (svgEl) {
      svgEl.addEventListener('mousedown', (e) => {
        dragActivo = true;
        dragX0 = e.clientX;
        dragY0 = e.clientY;
        svgEl.style.cursor = 'grabbing';
      });
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  }

  function onMouseMove(e) {
    if (!dragActivo) return;
    offX += e.clientX - dragX0;
    offY += e.clientY - dragY0;
    dragX0 = e.clientX;
    dragY0 = e.clientY;
    dibujar();
  }

  function onMouseUp() {
    dragActivo = false;
  }

  function escXML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /* --------------------------------------------------------
     Abrir modal
     -------------------------------------------------------- */
  function abrir() {
    if (!SQLITE.db) {
      UI.toast('No hay base de datos abierta', 'error');
      return;
    }

    prepararCajas();
    if (cajas.length === 0) {
      UI.toast('La base de datos no tiene tablas', 'error');
      return;
    }

    zoom = 1;
    offX = 20;
    offY = 20;

    const html = `
      <div class="pym-dia-info" id="dia-info">
        Tablas: ${cajas.length} | Zoom: 100% | Click y arrastra para mover
      </div>
      <div class="pym-dia-lienzo" id="dia-lienzo"></div>
    `;

    const v = VENTANA.abrir({
      titulo: '9) Diagrama ER',
      ancho: 1100,
      html: html,
      botones: [
        { texto: 'Zoom -', clase: 'secundario', onClick: () => { zoom = Math.max(0.4, zoom - 0.2); actualizarInfo(); dibujar(); } },
        { texto: 'Zoom +', clase: 'secundario', onClick: () => { zoom = Math.min(2.5, zoom + 0.2); actualizarInfo(); dibujar(); } },
        { texto: '100%', clase: 'secundario', onClick: () => { zoom = 1; actualizarInfo(); dibujar(); } },
        { texto: 'Centrar', clase: 'secundario', onClick: () => { offX = 20; offY = 20; dibujar(); } },
        { texto: 'Cerrar', onClick: (v) => v.cerrar() }
      ]
    });

    contenedorSVG = v.cuerpo.querySelector('#dia-lienzo');
    dibujar();
  }

  function actualizarInfo() {
    const info = document.getElementById('dia-info');
    if (info) {
      info.textContent = 'Tablas: ' + cajas.length + ' | Zoom: ' + Math.round(zoom * 100) + '% | Click y arrastra para mover';
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
