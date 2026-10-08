/* ============================================================
   PYM Util - Accion: Crear DB (JSON -> SQLite)
   Archivo: js/acciones/crear-db.js

   Porta la logica de PYM_JSON_ESQUEMA.pbi + PYM_JSON_DB.pbi
   Genera una DB SQLite en memoria (sql.js) y la descarga.
   ============================================================ */

const ACCION_CREAR_DB = (() => {

  /* ============================================================
     UTILIDADES INTERNAS
     ============================================================ */

  // Cuenta filas de una tabla
  function contarFilas(tabla) {
    const res = SQLITE.consultar('SELECT COUNT(*) AS n FROM ' + tabla);
    return res.length > 0 ? res[0].n : 0;
  }

  // Lista todas las tablas creadas
  function listarTablas() {
    return SQLITE.consultar(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).map(r => r.name);
  }

  // Nombre base de la tabla a partir del archivo
  function nombreBaseTabla(nombreArchivo) {
    const sinExt = nombreArchivo.replace(/\.[^.]+$/, '').toLowerCase();
    return 'json_' + SQLITE.sanear(sinExt);
  }

  // Serializar un valor JSON como string para SQL
  function serializarValor(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }

  // Valor SQL listo para INSERT
  function valorSQL(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'object') return SQLITE.quote(JSON.stringify(v));
    return SQLITE.quote(String(v));
  }

  /* ============================================================
     DETECCION DE MAPA DINAMICO
     (claves tipo UUID, hashes, IDs largos)
     ============================================================ */
  function pareceUUID(s) {
    const n = s.length;
    let guiones = 0;
    for (let i = 0; i < n; i++) {
      const c = s.charCodeAt(i);
      if (c === 45) { guiones++; continue; }  // '-'
      const esHex = (c >= 48 && c <= 57) || (c >= 97 && c <= 102) || (c >= 65 && c <= 70);
      if (!esHex) return false;
    }
    if (n === 36 && guiones === 4) return true;
    if (n === 32 && guiones === 0) return true;
    return false;
  }

  function esMapaDinamico(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length < 2) return false;

    let dinamicas = 0;
    const muestra = keys.slice(0, 10);
    for (const k of muestra) {
      if (pareceUUID(k)) dinamicas++;
      else if (k.length > 24) dinamicas++;
    }
    return (dinamicas * 2) >= muestra.length;
  }

  /* ============================================================
     CREACION DE TABLAS Y REGISTRO
     ============================================================ */

  let tablasCreadas = new Set();
  let filasInsertadas = 0;

  function crearTabla(nombre, columnas, conParent) {
    if (tablasCreadas.has(nombre)) return true;

    SQLITE.ejecutar('DROP TABLE IF EXISTS ' + nombre);

    let sql = 'CREATE TABLE ' + nombre + ' (id INTEGER PRIMARY KEY AUTOINCREMENT';
    if (conParent) sql += ', parent_id INTEGER';
    for (const col of columnas) {
      sql += ', ' + SQLITE.sanear(col) + ' TEXT';
    }
    sql += ')';

    if (!SQLITE.ejecutar(sql)) return false;
    tablasCreadas.add(nombre);
    return true;
  }

  function insertarFila(tabla, columnas, valores, parentId) {
    const cols = [];
    const vals = [];

    if (parentId && parentId > 0) {
      cols.push('parent_id');
      vals.push(String(parentId));
    }
    for (let i = 0; i < columnas.length; i++) {
      cols.push(SQLITE.sanear(columnas[i]));
      vals.push(valores[i]);
    }

    const sql = 'INSERT INTO ' + tabla +
                ' (' + cols.join(', ') + ')' +
                ' VALUES (' + vals.join(', ') + ')';

    if (!SQLITE.ejecutar(sql)) return 0;
    filasInsertadas++;
    return SQLITE.ultimoId();
  }

  /* ============================================================
     RECOLECCION DE COLUMNAS
     ============================================================ */
  function recolectarClaves(obj) {
    return Object.keys(obj);
  }

  function recolectarEscalares(obj) {
    return Object.keys(obj).filter(k => {
      const v = obj[k];
      return v === null || typeof v !== 'object';
    });
  }

  /* ============================================================
     PROCESAMIENTO RECURSIVO
     ============================================================ */

  const MAX_NIVEL = 8;

  // Procesa un objeto como fila principal de una tabla
  function procesarObjeto(obj, nombreTabla, parentId, nivel) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 0;

    const escalares = recolectarEscalares(obj);
    const todasLasClaves = recolectarClaves(obj);

    if (!crearTabla(nombreTabla, escalares, parentId > 0)) return 0;

    // Insertar fila con los escalares
    const valores = escalares.map(k => valorSQL(obj[k]));
    const idNuevo = insertarFila(nombreTabla, escalares, valores, parentId);
    if (idNuevo === 0) return 0;

    // Procesar hijos (objetos y arrays)
    if (nivel < MAX_NIVEL) {
      for (const clave of todasLasClaves) {
        const v = obj[clave];
        if (v === null || typeof v !== 'object') continue;

        const subTabla = nombreTabla + '__' + SQLITE.sanear(clave.toLowerCase());

        if (Array.isArray(v)) {
          procesarArrayComoHija(v, subTabla, idNuevo, nivel + 1);
        } else if (esMapaDinamico(v)) {
          procesarMapaComoHija(v, subTabla, idNuevo, nivel + 1);
        } else {
          procesarObjeto(v, subTabla, idNuevo, nivel + 1);
        }
      }
    }

    return idNuevo;
  }

  // Procesa un array como tabla hija
  function procesarArrayComoHija(arr, nombreTabla, parentId, nivel) {
    if (!Array.isArray(arr)) return 0;
    if (arr.length === 0) {
      crearTabla(nombreTabla, ['valor'], true);
      return 0;
    }

    const primero = arr[0];
    const esObjetos = primero && typeof primero === 'object' && !Array.isArray(primero);

    if (esObjetos) {
      // Columnas = union de todas las claves escalares de todos los elementos
      const setCols = new Set();
      for (const el of arr) {
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          for (const k of Object.keys(el)) {
            const v = el[k];
            if (v === null || typeof v !== 'object') setCols.add(k);
          }
        }
      }
      const columnas = Array.from(setCols);
      if (columnas.length === 0) columnas.push('valor');

      crearTabla(nombreTabla, columnas, true);

      for (const el of arr) {
        if (!el || typeof el !== 'object' || Array.isArray(el)) continue;

        const valores = columnas.map(k => valorSQL(el[k]));
        const idFila = insertarFila(nombreTabla, columnas, valores, parentId);

        // Anidados dentro del elemento
        if (nivel < MAX_NIVEL && idFila > 0) {
          for (const clave of Object.keys(el)) {
            const v = el[clave];
            if (v === null || typeof v !== 'object') continue;

            const subTabla = nombreTabla + '__' + SQLITE.sanear(clave.toLowerCase());
            if (Array.isArray(v)) {
              procesarArrayComoHija(v, subTabla, idFila, nivel + 1);
            } else if (esMapaDinamico(v)) {
              procesarMapaComoHija(v, subTabla, idFila, nivel + 1);
            } else {
              procesarObjeto(v, subTabla, idFila, nivel + 1);
            }
          }
        }
      }
    } else {
      // Array de escalares
      crearTabla(nombreTabla, ['valor'], true);
      for (const el of arr) {
        insertarFila(nombreTabla, ['valor'], [valorSQL(el)], parentId);
      }
    }

    return arr.length;
  }

  // Procesa un mapa dinamico (claves UUID) como tabla de filas
  function procesarMapaComoHija(mapa, nombreTabla, parentId, nivel) {
    if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return 0;

    const keys = Object.keys(mapa);
    if (keys.length === 0) return 0;

    // Detectar si los valores son objetos o escalares
    let esObjetos = false;
    for (const k of keys.slice(0, 5)) {
      const v = mapa[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        esObjetos = true;
        break;
      }
    }

    if (esObjetos) {
      // Recoger columnas escalares del primer objeto
      const primerValor = mapa[keys[0]];
      const escPrimero = primerValor && typeof primerValor === 'object'
        ? recolectarEscalares(primerValor)
        : [];

      const columnas = ['clave'].concat(escPrimero);
      crearTabla(nombreTabla, columnas, true);

      for (const llave of keys) {
        const v = mapa[llave];
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;

        const valores = [SQLITE.quote(llave)];
        for (const c of escPrimero) valores.push(valorSQL(v[c]));

        const idFila = insertarFila(nombreTabla, columnas, valores, parentId);

        // Anidados
        if (nivel < MAX_NIVEL && idFila > 0) {
          for (const clave of Object.keys(v)) {
            const vv = v[clave];
            if (vv === null || typeof vv !== 'object') continue;

            const subTabla = nombreTabla + '__' + SQLITE.sanear(clave.toLowerCase());
            if (Array.isArray(vv)) {
              procesarArrayComoHija(vv, subTabla, idFila, nivel + 1);
            } else if (esMapaDinamico(vv)) {
              procesarMapaComoHija(vv, subTabla, idFila, nivel + 1);
            } else {
              procesarObjeto(vv, subTabla, idFila, nivel + 1);
            }
          }
        }
      }
    } else {
      // Mapa de escalares: tabla con clave + valor
      crearTabla(nombreTabla, ['clave', 'valor'], true);
      for (const llave of keys) {
        const v = mapa[llave];
        if (v !== null && typeof v === 'object') continue;
        insertarFila(nombreTabla, ['clave', 'valor'],
                     [SQLITE.quote(llave), valorSQL(v)], parentId);
      }
    }

    return keys.length;
  }

  /* ============================================================
     PUNTO DE ENTRADA
     ============================================================ */
  async function ejecutar() {
    // 1) Verificar que hay JSON cargado
    if (!ESTADO.hayJSON()) {
      UI.toast('Primero carga un JSON', 'error');
      return;
    }

    const obj = ESTADO.datos.objetoJSON;
    const nombreArchivo = ESTADO.datos.rutaJSON || 'archivo.json';

    // 2) Inicializar sql.js
    if (!SQLITE.listo) {
      UI.toast('Inicializando SQLite...', 'info', 1500);
      const ok = await SQLITE.init();
      if (!ok) {
        UI.toast('No se pudo inicializar SQLite', 'error');
        return;
      }
    }

    // 3) Crear DB vacia en memoria
    SQLITE.crear();
    tablasCreadas = new Set();
    filasInsertadas = 0;

    // 4) Determinar tipo de raiz y procesar
    const nombreT = nombreBaseTabla(nombreArchivo);

    UI.toast('Creando DB con esquema normalizado...', 'info', 1500);

    try {
      if (Array.isArray(obj)) {
        if (obj.length === 0) throw new Error('Array raiz vacio');

        // Si los elementos son objetos, primera tabla con nombre base
        const primero = obj[0];
        if (primero && typeof primero === 'object' && !Array.isArray(primero)) {
          procesarArrayComoHija(obj, nombreT, 0, 0);
        } else {
          // Array de escalares
          crearTabla(nombreT, ['valor'], false);
          for (const el of obj) {
            insertarFila(nombreT, ['valor'], [valorSQL(el)], 0);
          }
        }
      } else if (obj && typeof obj === 'object') {
        if (esMapaDinamico(obj)) {
          procesarMapaComoHija(obj, nombreT, 0, 0);
        } else {
          procesarObjeto(obj, nombreT, 0, 0);
        }
      } else {
        throw new Error('Tipo de raiz no soportado');
      }
    } catch (e) {
      console.error(e);
      UI.toast('Error al procesar: ' + e.message, 'error');
      return;
    }

    // 5) Resumen de lo creado
    const tablas = listarTablas();
    if (tablas.length === 0) {
      UI.toast('No se creo ninguna tabla', 'error');
      return;
    }

    // 6) Armar resumen HTML para mostrar
    const filasResumen = tablas.map(t => {
      const n = contarFilas(t);
      filasInsertadas += 0;  // ya lo contamos al insertar
      return '<li><b>' + UI.esc(t) + '</b> - ' + n + ' filas</li>';
    }).join('');

    const html = `
      <p>Base de datos creada correctamente.</p>
      <p><b>Archivo origen:</b> ${UI.esc(nombreArchivo)}</p>
      <p><b>Tablas creadas:</b> ${tablas.length}</p>
      <p><b>Filas insertadas:</b> ${filasInsertadas}</p>
      <div class="pym-lista-tablas">
        <ul>${filasResumen}</ul>
      </div>
      <p style="margin-top:12px;">
        <label>Nombre del archivo SQLite:</label>
        <input type="text" id="cdb-nombre" value="${UI.esc(nombreArchivo.replace(/\.json$/i, '') + '.sqlite')}"
               style="width:100%;padding:8px;margin-top:4px;border:1px solid #a0c8a0;border-radius:6px;">
      </p>
    `;

    const v = VENTANA.abrir({
      titulo: '2) Crear DB - Resultado',
      ancho: 620,
      html: html,
      botones: [
        { texto: 'Cerrar', clase: 'secundario', onClick: (v) => { SQLITE.cerrar(); v.cerrar(); } },
        { texto: 'Descargar SQLite', onClick: (v) => {
            const nombre = v.cuerpo.querySelector('#cdb-nombre').value || 'salida.sqlite';
            const bytes = SQLITE.exportar();
            const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
            UI.descargar(nombre, blob, 'application/x-sqlite3');
            UI.toast('DB descargada: ' + nombre);
            v.cerrar();
          }
        }
      ]
    });
  }

  /* ============================================================
     API PUBLICA
     ============================================================ */
  return { ejecutar };

})();
