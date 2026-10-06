/* ============================================================
   PYM_LOGIN - LÃ³gica de la pantalla de PIN
   ============================================================ */

(function () {

  // ==================== ESTADO LOCAL ====================
  let pinIngresado = '';
  let modoCrear = false;   // true = creando PIN, false = verificando
  let pinTemporal = '';    // guarda el primer PIN al crear, para confirmar

  // ==================== ELEMENTOS ====================
  const panelCrear = document.getElementById('panel-crear');
  const panelLogin = document.getElementById('panel-login');
  const errorCrear = document.getElementById('error-crear');
  const errorLogin = document.getElementById('error-login');
  const dotsCrear  = document.querySelectorAll('#pin-display-crear .pin-dot');
  const dotsLogin  = document.querySelectorAll('#pin-display-login .pin-dot');
  const btnOlvide  = document.getElementById('btn-olvide');

  // ==================== DETECTAR PLATAFORMA ====================
  (function detectarPlataforma() {
    const ua = navigator.userAgent || '';
    const esMovil = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth < 720;
    document.body.setAttribute('data-plataforma', esMovil ? 'movil' : 'pc');
  })();

  // ==================== DIBUJAR DOTS ====================
  function pintarDots(dots, n) {
    dots.forEach((d, i) => {
      d.classList.toggle('activo', i < n);
      d.classList.remove('error');
    });
  }

  function marcarError(dots) {
    dots.forEach(d => d.classList.add('error'));
    setTimeout(() => {
      dots.forEach(d => d.classList.remove('error'));
    }, 400);
  }

  // ==================== INICIALIZAR ====================
  function init() {
    if (AUTH.hayPIN()) {
      // Ya hay PIN â†’ panel de login
      modoCrear = false;
      panelLogin.classList.remove('hidden');
      panelCrear.classList.add('hidden');
    } else {
      // No hay PIN â†’ crear
      modoCrear = true;
      panelCrear.classList.remove('hidden');
      panelLogin.classList.add('hidden');
    }

    // Enlazar teclados
    document.querySelectorAll('#panel-crear .pin-key').forEach(btn => {
      btn.addEventListener('click', () => onTecla(btn.dataset.key, 'crear'));
    });
    document.querySelectorAll('#panel-login .pin-key').forEach(btn => {
      btn.addEventListener('click', () => onTecla(btn.dataset.key, 'login'));
    });

    // Teclado fÃ­sico (0-9, Backspace, Enter)
    document.addEventListener('keydown', (e) => {
      const panel = modoCrear ? 'crear' : 'login';
      if (/^[0-9]$/.test(e.key))        onTecla(e.key, panel);
      else if (e.key === 'Backspace')   onTecla('borrar', panel);
      else if (e.key === 'Enter')       onTecla('ok', panel);
    });

    // BotÃ³n "olvidÃ© mi PIN"
    if (btnOlvide) {
      btnOlvide.addEventListener('click', () => {
        if (confirm('Esto borra el PIN guardado y todos los datos locales.\n\nÂ¿Continuar?')) {
          AUTH.borrarPIN();
          location.reload();
        }
      });
    }
  }

  // ==================== TECLA PRESIONADA ====================
  async function onTecla(key, panel) {
    const dots = panel === 'crear' ? dotsCrear : dotsLogin;
    const errEl = panel === 'crear' ? errorCrear : errorLogin;
    errEl.textContent = '';

    if (key === 'borrar') {
      pinIngresado = pinIngresado.slice(0, -1);
      pintarDots(dots, pinIngresado.length);
      return;
    }

    if (key === 'ok') {
      if (pinIngresado.length < 4) {
        errEl.textContent = 'El PIN debe tener al menos 4 dÃ­gitos.';
        marcarError(dots);
        return;
      }
      if (panel === 'crear') {
        await procesarCrear();
      } else {
        await procesarLogin();
      }
      return;
    }

    // DÃ­gito
    if (pinIngresado.length >= 6) return;
    pinIngresado += key;
    pintarDots(dots, pinIngresado.length);

    // Auto-OK en login al llegar a 6 (opcional, se puede quitar)
    // if (panel === 'login' && pinIngresado.length === 6) await procesarLogin();
  }

  // ==================== CREAR PIN (2 pasos) ====================
  async function procesarCrear() {
    if (!pinTemporal) {
      // Paso 1: guardar el primer PIN, pedir confirmaciÃ³n
      pinTemporal = pinIngresado;
      pinIngresado = '';
      pintarDots(dotsCrear, 0);
      errorCrear.textContent = 'RepetÃ­ el PIN para confirmar.';
      errorCrear.style.color = '#1565c0';
      return;
    }
    // Paso 2: verificar coincidencia
    if (pinTemporal !== pinIngresado) {
      errorCrear.textContent = 'Los PIN no coinciden. EmpezÃ¡ de nuevo.';
      errorCrear.style.color = '#c62828';
      marcarError(dotsCrear);
      pinTemporal = '';
      pinIngresado = '';
      pintarDots(dotsCrear, 0);
      return;
    }
    // OK â†’ guardar
    try {
      await AUTH.crearPIN(pinTemporal);
      // Auto-login
      localStorage.setItem('pym_json_sesion', Date.now().toString());
      location.replace('index.html');
    } catch (e) {
      errorCrear.textContent = e.message;
      errorCrear.style.color = '#c62828';
      marcarError(dotsCrear);
      pinTemporal = '';
      pinIngresado = '';
      pintarDots(dotsCrear, 0);
    }
  }

  // ==================== VERIFICAR PIN ====================
  async function procesarLogin() {
    try {
      await AUTH.verificarPIN(pinIngresado);
      // OK â†’ ir a la app
      location.replace('index.html');
    } catch (e) {
      errorLogin.textContent = e.message;
      marcarError(dotsLogin);
      pinIngresado = '';
      setTimeout(() => pintarDots(dotsLogin, 0), 400);
    }
  }

  // ==================== ARRANQUE ====================
  init();
})();
