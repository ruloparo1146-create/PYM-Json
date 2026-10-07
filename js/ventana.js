/* ============================================================
   PYM_VENTANA - Sistema de modales (reemplaza OpenWindow)
   Uso:
     const v = VENTANA.abrir({
       titulo: 'Mi ventana',
       html: '<p>Hola</p>',
       ancho: 600,
       onCerrar: () => {},
       botones: [
         { texto: 'Guardar', clase: 'pym-btn-accion', onClick: (v) => {...} },
         { texto: 'Cancelar', clase: 'secundario', onClick: (v) => v.cerrar() }
       ]
     });
     v.cuerpo.querySelector('#algo')  // acceder al DOM interno
   ============================================================ */

const VENTANA = (() => {

  function abrir(opciones = {}) {
    const {
      titulo = 'Ventana',
      html   = '',
      ancho  = 720,
      botones = [],
      onCerrar = null,
      cerrarAlFondo = true
    } = opciones;

    const cont = document.getElementById('pym-modales');

    const fondo = document.createElement('div');
    fondo.className = 'pym-modal-fondo';

    const modal = document.createElement('div');
    modal.className = 'pym-modal';
    modal.style.maxWidth = ancho + 'px';

    modal.innerHTML = `
      <div class="pym-modal-header">
        <h2>${UI.esc(titulo)}</h2>
        <button class="pym-modal-cerrar" title="Cerrar">&times;</button>
      </div>
      <div class="pym-modal-cuerpo"></div>
    `;

    const cuerpo = modal.querySelector('.pym-modal-cuerpo');
    if (typeof html === 'string') {
      cuerpo.innerHTML = html;
    } else if (html instanceof HTMLElement) {
      cuerpo.appendChild(html);
    }

    // Pie de botones
    let pie = null;
    if (botones.length > 0) {
      pie = document.createElement('div');
      pie.className = 'pym-modal-pie';
      botones.forEach(b => {
        const btn = document.createElement('button');
        btn.textContent = b.texto;
        btn.className = 'pym-btn-accion' + (b.clase === 'secundario' ? ' secundario' : '');
        btn.addEventListener('click', () => b.onClick?.(api));
        pie.appendChild(btn);
      });
      modal.appendChild(pie);
    }

    fondo.appendChild(modal);
    cont.appendChild(fondo);

    function cerrar() {
      onCerrar?.();
      fondo.style.opacity = '0';
      setTimeout(() => fondo.remove(), 150);
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
      if (e.key === 'Escape') cerrar();
    }
    document.addEventListener('keydown', onKey);

    modal.querySelector('.pym-modal-cerrar').addEventListener('click', cerrar);
    if (cerrarAlFondo) {
      fondo.addEventListener('click', (e) => {
        if (e.target === fondo) cerrar();
      });
    }

    const api = { fondo, modal, cuerpo, pie, cerrar };
    return api;
  }

  // Pregunta rápida tipo alert
  function alerta(titulo, mensaje) {
    return abrir({
      titulo,
      ancho: 420,
      html: `<p>${UI.esc(mensaje)}</p>`,
      botones: [{ texto: 'OK', onClick: v => v.cerrar() }]
    });
  }

  // Confirmación con promesa
  function confirmar(titulo, mensaje) {
    return new Promise((resolve) => {
      abrir({
        titulo,
        ancho: 420,
        html: `<p>${UI.esc(mensaje)}</p>`,
        onCerrar: () => resolve(false),
        botones: [
          { texto: 'Cancelar', clase: 'secundario', onClick: v => { v.cerrar(); } },
          { texto: 'Aceptar',  onClick: v => { resolve(true); v.cerrar(); } }
        ]
      });
    });
  }

  return { abrir, alerta, confirmar };
})();
