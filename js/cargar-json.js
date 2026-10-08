/* ============================================================
   PYM Util - Accion: Cargar JSON
   Archivo: js/acciones/cargar-json.js
   ============================================================ */

const ACCION_CARGAR_JSON = (() => {

  /* --------------------------------------------------------
     Clasificador rapido de JSON (heuristica simple)
     Mas adelante se puede reemplazar por el modulo completo.
     -------------------------------------------------------- */
  function clasificar(objeto) {
    // Array en la raiz
    if (Array.isArray(objeto)) {
      const n = objeto.length;
      if (n > 0 && typeof objeto[0] === 'object' && objeto[0] !== null && !Array.isArray(objeto[0])) {
        const claves = Object.keys(objeto[0]);
        return {
          nombre: 'Array de objetos',
          descripcion: n + ' elementos, ' + claves.length + ' campos por objeto'
        };
      }
      return { nombre: 'Array generico', descripcion: n + ' elementos' };
    }

    // Objeto en la raiz
    if (objeto && typeof objeto === 'object') {
      const claves = Object.keys(objeto);

      if (claves.includes('name') && claves.includes('short_name')) {
        return { nombre: 'Manifest PWA', descripcion: 'Manifest de app web' };
      }
      if (claves.includes('name') && claves.includes('version')) {
        return { nombre: 'Package npm', descripcion: 'Manifiesto de proyecto Node' };
      }
      if (claves.includes('type') && claves.includes('features')) {
        return { nombre: 'GeoJSON', descripcion: 'Estructura geografica' };
      }
      if (claves.includes('paths') && claves.includes('info')) {
        return { nombre: 'OpenAPI / Swagger', descripcion: 'Definicion de API' };
      }
      if (claves.includes('chat_messages')) {
        return { nombre: 'Chat / Conversacion IA', descripcion: 'Registro de chat' };
      }
      if (claves.includes('compilerOptions')) {
        return { nombre: 'Configuracion TypeScript', descripcion: 'tsconfig.json' };
      }

      return {
        nombre: 'Objeto generico',
        descripcion: claves.length + ' claves en la raiz'
      };
    }

    return { nombre: 'Escalar', descripcion: 'JSON sin estructura' };
  }

  /* --------------------------------------------------------
     Ejecutar la accion
     -------------------------------------------------------- */
  async function ejecutar() {
    // 1) Pedir archivo
    const file = await UI.pedirArchivo('.json,application/json');
    if (!file) return;

    // 2) Leer y parsear
    let texto, objeto;
    try {
      texto = await file.text();
      objeto = JSON.parse(texto);
    } catch (e) {
      UI.toast('JSON invalido: ' + e.message, 'error');
      return;
    }

    // 3) Guardar en el estado global
    ESTADO.setJSON(file.name, texto, objeto);
    ESTADO.datos.tipoJSON = clasificar(objeto);

    // 4) Actualizar UI (header, footer, etc.)
    const tipo = ESTADO.datos.tipoJSON;
    UI.infoArchivo(
      'JSON: <b>' + UI.esc(file.name) + '</b> &nbsp;|&nbsp; ' +
      'Tipo: <b>' + UI.esc(tipo.nombre) + '</b>'
    );
    UI.estado('JSON cargado | ' + tipo.descripcion);
    UI.toast('JSON cargado: ' + file.name);

    // 5) Guardar en config (para restaurar la proxima vez)
    CFG.setUltimoJSON(file.name);

    // 6) *** CLAVE *** redibujar el menu para activar
    //    los botones que dependen del JSON cargado
    MENU.refrescar();
  }

  /* --------------------------------------------------------
     API publica
     -------------------------------------------------------- */
  return {
    ejecutar,
    clasificar
  };

})();
