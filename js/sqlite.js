/* ============================================================
   PYM Util - Helper de SQLite (sql.js)
   Archivo: js/sqlite.js
   ============================================================ */

const SQLITE = (() => {

  let SQL = null;         // instancia de sql.js
  let db  = null;         // database actual en memoria
  let listo = false;

  /* --------------------------------------------------------
     Inicializar sql.js (solo una vez)
     -------------------------------------------------------- */
  async function init() {
    if (listo) return true;

    if (typeof initSqlJs !== 'function') {
      console.error('[SQLITE] sql.js no esta cargado. Verifica el <script> en el HTML.');
      return false;
    }

    SQL = await initSqlJs({
      locateFile: (file) => 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/' + file
    });

    listo = true;
    console.log('[SQLITE] sql.js listo');
    return true;
  }

  /* --------------------------------------------------------
     Crear una DB nueva en memoria
     -------------------------------------------------------- */
  function crear() {
    if (!listo) throw new Error('SQLITE no esta inicializado');
    if (db) db.close();
    db = new SQL.Database();
    return db;
  }

  /* --------------------------------------------------------
     Cerrar la DB actual
     -------------------------------------------------------- */
  function cerrar() {
    if (db) { db.close(); db = null; }
  }

  /* --------------------------------------------------------
     Ejecutar SQL sin resultados (CREATE, INSERT, etc.)
     Devuelve true/false
     -------------------------------------------------------- */
  function ejecutar(sql) {
    try {
      db.run(sql);
      return true;
    } catch (e) {
      console.error('[SQLITE] Error ejecutando:', sql.slice(0, 100), '\n', e.message);
      return false;
    }
  }

  /* --------------------------------------------------------
     Ejecutar un SELECT y devolver filas como arrays de objetos
     -------------------------------------------------------- */
  function consultar(sql) {
    const res = db.exec(sql);
    if (!res || res.length === 0) return [];

    const cols = res[0].columns;
    const vals = res[0].values;

    return vals.map(fila => {
      const obj = {};
      for (let i = 0; i < cols.length; i++) obj[cols[i]] = fila[i];
      return obj;
    });
  }

  /* --------------------------------------------------------
     Obtener el ID de la ultima fila insertada
     -------------------------------------------------------- */
  function ultimoId() {
    const res = db.exec('SELECT last_insert_rowid() AS id');
    if (!res || !res[0] || !res[0].values[0]) return 0;
    return res[0].values[0][0];
  }

  /* --------------------------------------------------------
     Escapar identificador SQL (nombre de tabla/columna)
     -------------------------------------------------------- */
  function sanear(nombre) {
    return String(nombre)
      .replace(/\s+/g, '_')
      .replace(/[-.\/]/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '');
  }

  /* --------------------------------------------------------
     Escapar valor para SQL (string entre comillas simples)
     -------------------------------------------------------- */
  function quote(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  /* --------------------------------------------------------
     Exportar la DB actual como Uint8Array (para descargar)
     -------------------------------------------------------- */
  function exportar() {
    return db.export();
  }

  /* --------------------------------------------------------
     Importar una DB desde un Uint8Array
     -------------------------------------------------------- */
  function importar(bytes) {
    if (!listo) throw new Error('SQLITE no esta inicializado');
    if (db) db.close();
    db = new SQL.Database(bytes);
    return db;
  }

  /* --------------------------------------------------------
     API publica
     -------------------------------------------------------- */
  return {
    init,
    crear,
    cerrar,
    ejecutar,
    consultar,
    ultimoId,
    sanear,
    quote,
    exportar,
    importar,
    get db() { return db; }
  };

})();
