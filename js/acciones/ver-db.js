/* ============================================================
   PYM Util - Accion: Ver DB
   Archivo: js/acciones/ver-db.js

   Abre el visor SQLite con la DB que ya este en SQLITE.db.
   La DB puede venir de:
     - "2) Crear DB" (recien generada)
     - "5) Abrir SQLite" (cargada desde archivo)
   ============================================================ */

const ACCION_VER_DB = (() => {

  async function ejecutar() {
    // 1) Inicializar SQLITE si no esta
    if (!SQLITE.listo) {
      const ok = await SQLITE.init();
      if (!ok) {
        UI.toast('No se pudo inicializar SQLite', 'error');
        return;
      }
    }

    // 2) Verificar que hay una DB cargada
    if (!SQLITE.db) {
      // Si no hay DB en memoria pero el usuario cargo un JSON,
      // le avisamos que primero cree la DB
      if (ESTADO.hayJSON()) {
        const quiere = await VENTANA.confirmar(
          'Ver DB',
          'Todavia no hay base de datos generada.\n\nQueres crearla ahora con el JSON cargado?'
        );
        if (quiere) {
          await ACCION_CREAR_DB.ejecutar();
          // Despues de crear, el usuario tiene que volver a hacer click en Ver DB
          // porque la DB recien generada se descarga, no queda "abierta".
        }
        return;
      }
      UI.toast('No hay base de datos para ver. Crea una o abri un archivo SQLite.', 'error');
      return;
    }

    // 3) Abrir el visor
    DBV.abrir();
  }

  return { ejecutar };

})();
