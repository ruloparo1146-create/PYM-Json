/* ============================================================
   PYM_CONFIG - Persistencia en localStorage
   Reemplaza PYM_CONFIG.pbi (pym_config.ini)
   ============================================================ */

const CFG = (() => {
  const KEY = 'pym_json_cfg';

  const defaults = {
    ultimoJSON:    '',
    ultimoSQLite:  '',
    ultimaCarpeta: '',
    winX: -1, winY: -1, winW: 1000, winH: 620,
    plataforma: 'pc',   // 'pc' | 'movil'
    tema: 'verde'
  };

  let datos = { ...defaults };

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) datos = { ...defaults, ...JSON.parse(raw) };
    } catch (e) { console.warn('[CFG] Error al cargar:', e); }
    return datos;
  }

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(datos)); }
    catch (e) { console.warn('[CFG] Error al guardar:', e); }
  }

  return {
    cargar,
    guardar,
    get: (k) => datos[k],
    set: (k, v) => { datos[k] = v; guardar(); },
    setUltimoJSON: (ruta) => { datos.ultimoJSON = ruta; guardar(); },
    setUltimoSQLite: (ruta) => { datos.ultimoSQLite = ruta; guardar(); },
    todos: () => ({ ...datos })
  };
})();
