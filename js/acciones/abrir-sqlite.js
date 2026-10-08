/* ============================================================
   PYM Util - Accion: Abrir SQLite
   Archivo: js/acciones/abrir-sqlite.js

   Pide un archivo .sqlite / .db / .sqlite3 y lo carga en SQLITE.
   Despues abre el visor.
   ============================================================ */

const ACCION_ABRIR_SQLITE = (() => {

  async function ejecutar() {
    // 1) Pedir archivo
    const file = await UI.pedirArchivo('.sqlite,.db,.sqlite3,application/x-sqlite3');
    if (!file) return;

    // 2) Inicializar SQLITE
    if (!SQLITE.listo) {
      UI.toast('Inicializando SQLite...', 'info', 1500);
      const ok = await SQLITE.init();
      if (!ok) {
        UI.toast('No se pudo inicializar SQLite', 'error');
        return;
      }
    }

    // 3) Leer bytes del archivo
    UI.toast('Leyendo archivo...', 'info', 1000);
    let bytes;
    try {
      const buffer = await file.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } catch (e) {
      UI.toast('Error al leer archivo: ' + e.message, 'error');
      return;
    }

    // 4) Importar en sql.js
    try {
      SQLITE.importar(bytes);
    } catch (e) {
      UI.toast('Archivo no es una DB SQLite valida', 'error');
      console.error('[ABRIR-SQLITE]', e);
      return;
    }

    // 5) Guardar en config
    CFG.setUltimoSQLite(file.name);
    UI.estado('SQLite abierto: ' + file.name);

    // 6) Abrir visor
    UI.toast('SQLite abierto: ' + file.name);
    DBV.abrir();
  }

  return { ejecutar };

})();
