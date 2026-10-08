/* ============================================================
   PYM Util - Accion: TXT -> UTF-8
   Archivo: js/acciones/txt-utf8.js

   Porta la logica de PYM_TXT_UTF8.pbi
   - Detecta: UTF-8 BOM, UTF-8 sin BOM, UTF-16 LE/BE, ANSI
   - Reparar mojibake (CreÃƒÂ¡ -> CreÃ¡)
   - Guardar como UTF-8 con/sin BOM
   ============================================================ */

const ACCION_TXT_UTF8 = (() => {

  let archivo = null;
  let contenidoOriginal = '';
  let codificacionDetectada = 0;

  /* --------------------------------------------------------
     Detectar BOM y codificacion
     Devuelve: 1=UTF-8 BOM, 2=UTF-8 sin BOM, 3=UTF-16 LE, 4=UTF-16 BE, 5=ANSI
     -------------------------------------------------------- */
  function detectarCodificacion(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 1;
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 3;
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 4;

    // Sin BOM: probar si es UTF-8 valido
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(bytes);
      return 2;
    } catch (e) {
      return 5;  // ANSI / Latin-1
    }
  }

  /* --------------------------------------------------------
     Leer segun codificacion
     -------------------------------------------------------- */
  function leerConCodif(bytes, cod) {
    if (cod === 1) {
      // UTF-8 con BOM: quitar los 3 primeros bytes
      return new TextDecoder('utf-8').decode(bytes.slice(3));
    }
    if (cod === 2) {
      return new TextDecoder('utf-8').decode(bytes);
    }
    if (cod === 3) {
      return new TextDecoder('utf-16le').decode(bytes.slice(2));
    }
    if (cod === 4) {
      return new TextDecoder('utf-16be').decode(bytes.slice(2));
    }
    // ANSI: cada byte es un caracter Latin-1
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  /* --------------------------------------------------------
     Reparar mojibake (CreÃƒÂ¡ -> CreÃ¡)
     ------------------------------------------================ */
  function repararMojibake(texto) {
    let res = '';
    let i = 0;
    const n = texto.length;

    while (i < n) {
      const c = texto.charCodeAt(i);

      // 2 bytes UTF-8 mal interpretados como Latin-1: C2-C3 + 80-BF
      if (c >= 194 && c <= 195 && i + 1 < n) {
        const c2 = texto.charCodeAt(i + 1);
        if (c2 >= 128 && c2 <= 191) {
          const codePoint = ((c - 192) << 6) | (c2 - 128);
          res += String.fromCharCode(codePoint);
          i += 2;
          continue;
        }
      }

      // 3 bytes UTF-8 mal interpretados como Latin-1: E0-EF + 80-BF + 80-BF
      if (c >= 224 && c <= 239 && i + 2 < n) {
        const c2 = texto.charCodeAt(i + 1);
        const c3 = texto.charCodeAt(i + 2);
        if (c2 >= 128 && c2 <= 191 && c3 >= 128 && c3 <= 191) {
          const codePoint = ((c - 224) << 12) | ((c2 - 128) << 6) | (c3 - 128);
          res += String.fromCharCode(codePoint);
          i += 3;
          continue;
        }
      }

      res += texto[i];
      i++;
    }

    return res;
  }

  /* --------------------------------------------------------
     Nombre de la codificacion
     -------------------------------------------------------- */
  function nombreCodif(cod) {
    switch (cod) {
      case 1: return 'UTF-8 (con BOM)';
      case 2: return 'UTF-8 (sin BOM)';
      case 3: return 'UTF-16 LE';
      case 4: return 'UTF-16 BE';
      case 5: return 'ANSI / Latin-1 / Windows-1252';
    }
    return 'Desconocida';
  }

  /* --------------------------------------------------------
     Leer el archivo al inicio
     -------------------------------------------------------- */
  async function cargarArchivo(file) {
    archivo = file;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    codificacionDetectada = detectarCodificacion(bytes);
    contenidoOriginal = leerConCodif(bytes, codificacionDetectada);
  }

  /* --------------------------------------------------------
     Abrir modal
     -------------------------------------------------------- */
  function abrirModal() {
    const tamano = archivo.size;
    const kb = (tamano / 1024).toFixed(1);
    const lineas = contenidoOriginal.split('\n').length;

    const preview = contenidoOriginal.length > 50000
      ? contenidoOriginal.slice(0, 50000) + '\n\n... (truncado para preview)'
      : contenidoOriginal;

    const html = `
      <div class="pym-t2u-info">
        <b>Archivo:</b> ${UI.esc(archivo.name)}<br>
        <b>Tamano:</b> ${kb} KB (${tamano} bytes)<br>
        <b>Codificacion detectada:</b> ${nombreCodif(codificacionDetectada)}<br>
        <b>Caracteres:</b> ${contenidoOriginal.length} | <b>Lineas:</b> ${lineas}
      </div>

      <div class="pym-t2u-layout">
        <div class="pym-t2u-izq">
          <h4>Contenido (preview)</h4>
          <textarea id="t2u-preview" readonly>${UI.esc(preview)}</textarea>
        </div>

        <div class="pym-t2u-der">
          <h4>Opciones</h4>

          <label class="pym-t2u-opt">
            <input type="checkbox" id="t2u-reparar" checked>
            Reparar caracteres danados (CreÃƒÂ¡ -> CreÃ¡)
          </label>

          <label class="pym-t2u-opt">
            <input type="checkbox" id="t2u-bom" checked>
            Agregar BOM UTF-8 al archivo de salida
          </label>

          <h4 style="margin-top:16px;">Nombre del archivo</h4>
          <input type="text" id="t2u-nombre"
                 value="${UI.esc(archivo.name.replace(/\.[^.]+$/, '') + '_utf8.txt')}"
                 style="width:100%;padding:8px;border:1px solid #a0c8a0;border-radius:6px;font-family:inherit;">
        </div>
      </div>

      <div class="pym-exp-estado" id="t2u-estado">Listo.</div>
    `;

    const v = VENTANA.abrir({
      titulo: '17) TXT -> UTF-8',
      ancho: 900,
      html: html,
      botones: [
        { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() },
        { texto: 'Convertir a UTF-8', onClick: (v) => convertir(v) }
      ]
    });
  }

  /* --------------------------------------------------------
     Convertir y descargar
     -------------------------------------------------------- */
  function convertir(v) {
    const reparar = v.cuerpo.querySelector('#t2u-reparar').checked;
    const usarBOM = v.cuerpo.querySelector('#t2u-bom').checked;
    const nombre = v.cuerpo.querySelector('#t2u-nombre').value || 'salida_utf8.txt';

    let texto = contenidoOriginal;
    if (reparar) texto = repararMojibake(texto);

    // Preparar blob en UTF-8
    const bytes = new TextEncoder().encode(texto);
    let blob;
    if (usarBOM) {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const todo = new Uint8Array(bom.length + bytes.length);
      todo.set(bom, 0);
      todo.set(bytes, bom.length);
      blob = new Blob([todo], { type: 'text/plain;charset=utf-8' });
    } else {
      blob = new Blob([bytes], { type: 'text/plain;charset=utf-8' });
    }

    UI.descargar(nombre, blob, 'text/plain');
    UI.toast('Convertido: ' + nombre);
    v.cuerpo.querySelector('#t2u-estado').textContent = 'Convertido: ' + nombre;
  }

  /* --------------------------------------------------------
     Ejecutar
     -------------------------------------------------------- */
  async function ejecutar() {
    const file = await UI.pedirArchivo('.txt,.csv,.json,.log,.md,.html,.xml,text/*');
    if (!file) return;

    try {
      await cargarArchivo(file);
    } catch (e) {
      UI.toast('Error al leer el archivo: ' + e.message, 'error');
      return;
    }

    abrirModal();
  }

  return { ejecutar };

})();
