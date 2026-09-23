/**
 * Se ejecuta antes del primer pintado, por dos motivos:
 *
 * 1. Aplica el tema guardado para evitar el parpadeo blanco→oscuro al cargar.
 * 2. Deja a la vista cualquier error de arranque. Si el bundle falla (versión de
 *    navegador antigua, recurso bloqueado…), sin esto la pantalla se queda en negro
 *    y no hay forma de saber qué pasó desde un móvil.
 *
 * Va en un fichero aparte, y no incrustado en el HTML, para cumplir la directiva
 * script-src 'self' de la política de seguridad de contenido.
 */
(function () {
  try {
    var stored = localStorage.getItem('crm-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Sin preferencia guardada se usa el tema oscuro, que es el diseño base.
    if (stored === 'dark' || !stored || (stored === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    /* localStorage puede estar bloqueado en modo privado: el tema no es crítico */
  }

  function showFatalError(detail) {
    var root = document.getElementById('root');
    if (!root || root.getAttribute('data-fatal') === '1') return;
    root.setAttribute('data-fatal', '1');
    root.style.cssText =
      'font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto;' +
      'color:#0f172a;background:#fff;min-height:100%;';
    var safe = String(detail || 'Error desconocido').slice(0, 500);
    root.textContent = '';

    var title = document.createElement('h1');
    title.style.cssText = 'font-size:18px;margin:0 0 8px';
    title.textContent = 'La aplicación no ha podido arrancar';

    var help = document.createElement('p');
    help.style.cssText = 'font-size:14px;color:#475569;margin:0 0 12px';
    help.textContent = 'Detalle técnico del error:';

    var pre = document.createElement('pre');
    pre.style.cssText =
      'font-size:12px;white-space:pre-wrap;word-break:break-word;background:#f1f5f9;' +
      'padding:12px;border-radius:8px;margin:0';
    pre.textContent = safe;

    root.appendChild(title);
    root.appendChild(help);
    root.appendChild(pre);
  }

  window.addEventListener('error', function (event) {
    // Fallo al cargar un recurso (script, hoja de estilos) o error de ejecución.
    if (event.target && event.target !== window && event.target.src) {
      showFatalError('No se ha podido cargar el recurso: ' + event.target.src);
      return;
    }
    showFatalError(event.message);
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    showFatalError('Promesa rechazada: ' + (reason && reason.message ? reason.message : reason));
  });
})();
