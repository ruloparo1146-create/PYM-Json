/* ============================================================
   AcciÃ³n: Cargar JSON
   ============================================================ */

const ACCION_CARGAR_JSON = (() => {

  // Clasificador bÃ¡sico (mÃ¡s adelante lo ampliamos como PYM_JSON_TIPOS)
  function clasificar(objeto) {
    if (Array.isArray(objeto)) {
      const n = objeto.length;
      if (n > 0 && typeof objeto[0] === 'object' && objeto[0] !== null && !Array.isArray(objeto[0])) {
        const claves = Object.keys(objeto[0]);
        return {
          nombre: 'Array de objetos',
          descripcion: `${n} elementos, ${claves.length} campos por objeto`
        };
      }
      return { nombre: 'Array genÃ©rico', descripcion: `${n} elementos` };
    }
    if (objeto && typeof objeto === 'object') {
      const claves = Object.keys(objeto);
      // HeurÃ­sticas rÃ¡pidas
      if (claves.includes('name') && claves.includes('short_name')) {
        return { nombre: 'Manifest PWA', descripcion: 'Manifest de app web' };
      }
      if (claves.includes('name') && claves.includes('version')) {
        return { nombre: 'Package npm', descripcion: 'Manifiesto de proyecto Node' };
      }
      if (claves.includes('type') && claves.includes('features')) {
        return { nombre: 'GeoJSON', descripcion: 'Estructura geogrÃ¡fica' };
      }
      if (claves.includes('paths') && claves.includes('info')) {
        return { nombre: 'OpenAPI / Swagger', descripcion: 'DefiniciÃ³n de API' };
      }
      return {
        nombre: 'Objeto genÃ©rico',
        descripcion: `${claves.length} claves en la raÃ­z`
      };
    }
    return { nombre: 'Escalar', descripcion: 'JSON sin estructura' };
  }

  async function ejecutar() {
    const file = await UI.pedirArchivo('.json,application/json');
    if (!file) return;

    let texto, objeto;
    try {
      texto = await file.text();
      objeto = JSON.parse(texto);
    } catch (e) {
      UI.toast('JSON invÃ¡lido: ' + e.message, 'error');
      return;
    }

    ESTADO.setJSON(file.name, texto, objeto);
    ESTADO.datos.tipoJSON = clasificar(objeto);

    // Refrescar UI
    const tipo = ESTADO.datos.tipoJSON;
    UI.infoArchivo(
      `JSON: <b>${UI.esc(file.name)}</b> &nbsp;|&nbsp; Tipo: <b>${UI.esc(tipo.nombre)}</b>`
    );
    UI.estado(`JSON cargado | ${tipo.descripcion}`);
    UI.toast('JSON cargado: ' + file.name);

    CFG.setUltimoJSON(file.name);

    // Actualizar botones del menÃº (los que dependen de tener JSON)
    MENU.refrescar();
  }

  return { ejecutar, clasificar };
})();
