/* ============================================================
   PYM_ESTADO - Estado global de la app
   ============================================================ */

const ESTADO = (() => {
  const datos = {
    rutaJSON:     null,   // nombre del archivo cargado
    textoJSON:    null,   // texto crudo
    objetoJSON:   null,   // JSON.parse
    tipoJSON:     null,   // { nombre, descripcion, ... }
    rutaSQLite:   null    // para cuando guardemos DBs
  };

  // Notifica a los interesados cuando cambia algo
  const oyentes = [];
  function on(cb) { oyentes.push(cb); }
  function emitir() { oyentes.forEach(cb => cb(datos)); }

  function setJSON(nombre, texto, objeto) {
    datos.rutaJSON   = nombre;
    datos.textoJSON  = texto;
    datos.objetoJSON = objeto;
    emitir();
  }

  function limpiarJSON() {
    datos.rutaJSON   = null;
    datos.textoJSON  = null;
    datos.objetoJSON = null;
    datos.tipoJSON   = null;
    emitir();
  }

  function hayJSON() { return datos.objetoJSON !== null; }

  return { datos, setJSON, limpiarJSON, hayJSON, on };
})();
