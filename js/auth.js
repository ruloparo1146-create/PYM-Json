/* ============================================================
   PYM_AUTH - Autenticación por PIN local
   Guarda un hash SHA-256 del PIN en localStorage.
   ============================================================ */

const AUTH = (() => {

  const KEY_PIN   = 'pym_json_pin_hash';
  const KEY_SESION = 'pym_json_sesion';
  const KEY_INTENTOS = 'pym_json_intentos';
  const MAX_INTENTOS = 5;
  const BLOQUEO_MS = 60 * 1000; // 1 minuto

  // ---- Hash SHA-256 (usa Web Crypto API) ----
  async function hash(texto) {
    const buf = new TextEncoder().encode(texto + '|pym_json_salt');
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ---- ¿Hay PIN configurado? ----
  function hayPIN() {
    return !!localStorage.getItem(KEY_PIN);
  }

  // ---- Crear PIN (primera vez) ----
  async function crearPIN(pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error('El PIN debe tener entre 4 y 6 dígitos.');
    }
    const h = await hash(pin);
    localStorage.setItem(KEY_PIN, h);
    localStorage.removeItem(KEY_INTENTOS);
    return true;
  }

  // ---- Verificar PIN ----
  async function verificarPIN(pin) {
    // Chequear bloqueo
    const bloq = bloqueoRestante();
    if (bloq > 0) {
      throw new Error(`Bloqueado. Esperá ${Math.ceil(bloq / 1000)} segundos.`);
    }

    const guardado = localStorage.getItem(KEY_PIN);
    if (!guardado) throw new Error('No hay PIN configurado.');

    const h = await hash(pin);
    if (h === guardado) {
      localStorage.removeItem(KEY_INTENTOS);
      localStorage.setItem(KEY_SESION, Date.now().toString());
      return true;
    }

    // Registrar intento fallido
    const intentos = parseInt(localStorage.getItem(KEY_INTENTOS) || '0', 10) + 1;
    localStorage.setItem(KEY_INTENTOS, intentos.toString());
    localStorage.setItem(KEY_INTENTOS + '_ts', Date.now().toString());

    const restantes = MAX_INTENTOS - intentos;
    if (restantes <= 0) {
      throw new Error('Demasiados intentos. Bloqueado por 1 minuto.');
    }
    throw new Error(`PIN incorrecto. Te quedan ${restantes} intentos.`);
  }

  // ---- Bloqueo ----
  function bloqueoRestante() {
    const intentos = parseInt(localStorage.getItem(KEY_INTENTOS) || '0', 10);
    if (intentos < MAX_INTENTOS) return 0;
    const ts = parseInt(localStorage.getItem(KEY_INTENTOS + '_ts') || '0', 10);
    const transcurrido = Date.now() - ts;
    if (transcurrido >= BLOQUEO_MS) {
      localStorage.removeItem(KEY_INTENTOS);
      localStorage.removeItem(KEY_INTENTOS + '_ts');
      return 0;
    }
    return BLOQUEO_MS - transcurrido;
  }

  // ---- Sesión activa ----
  function haySesion() {
    return !!localStorage.getItem(KEY_SESION);
  }

  function cerrarSesion() {
    localStorage.removeItem(KEY_SESION);
  }

  // ---- Cambiar PIN ----
  async function cambiarPIN(pinViejo, pinNuevo) {
    await verificarPIN(pinViejo);
    await crearPIN(pinNuevo);
  }

  // ---- Borrar PIN (reset total) ----
  function borrarPIN() {
    localStorage.removeItem(KEY_PIN);
    localStorage.removeItem(KEY_SESION);
    localStorage.removeItem(KEY_INTENTOS);
    localStorage.removeItem(KEY_INTENTOS + '_ts');
  }

  return {
    hayPIN, crearPIN, verificarPIN,
    haySesion, cerrarSesion, cambiarPIN, borrarPIN,
    bloqueoRestante
  };
})();
