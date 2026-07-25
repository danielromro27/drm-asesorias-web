/**
 * DRM Asesorías — interacciones del sitio
 * Vanilla JS, sin dependencias externas.
 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------- Google Analytics 4: helper de eventos --------------------
     Estructura preparada para medir interacciones clave. No bloquea la ejecución
     si gtag no está disponible (bloqueadores de anuncios, fallo de red, etc.). */
  function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
  }

  /* Clic en WhatsApp (botón flotante) */
  var whatsappFab = document.querySelector('.whatsapp-fab');
  if (whatsappFab) {
    whatsappFab.addEventListener('click', function () {
      trackEvent('click_whatsapp', { event_category: 'contacto', event_label: 'whatsapp_flotante' });
    });
  }

  /* Clic en enlaces de correo (mailto:) */
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackEvent('click_email', { event_category: 'contacto', event_label: link.getAttribute('href') });
    });
  });

  /* Clic en enlaces de LinkedIn */
  document.querySelectorAll('a[href*="linkedin.com"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackEvent('click_linkedin', { event_category: 'redes_sociales', event_label: link.getAttribute('href') });
    });
  });

  /* -------------------- Tarjetas de empresas: efecto flip -------------------- */
  document.querySelectorAll('.case-card--client').forEach(function (card) {
    function toggleFlip() {
      var isFlipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(isFlipped));
    }

    card.addEventListener('click', toggleFlip);
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFlip();
      }
    });
  });

  /* -------------------- Header scroll transition -------------------- */
  var siteHeader = document.querySelector('.site-header');

  if (siteHeader) {
    var scrollTicking = false;
    var SCROLL_THRESHOLD = 24;

    var updateHeaderState = function () {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
      scrollTicking = false;
    };

    window.addEventListener('scroll', function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateHeaderState);
        scrollTicking = true;
      }
    }, { passive: true });

    updateHeaderState();
  }

  /* -------------------- Mobile menu -------------------- */
  var navToggle = document.querySelector('.nav-toggle');
  var mobileMenu = document.getElementById('mobile-menu');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú de navegación');
      });
    });
  }

  /* -------------------- Reveal on scroll -------------------- */
  var revealTargets = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealTargets.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -80px 0px' }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* -------------------- Scroll spy for nav links -------------------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));

  if ('IntersectionObserver' in window && sections.length && navLinks.length) {
    var spyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              var isMatch = link.getAttribute('href') === '#' + id;
              link.classList.toggle('is-active', isMatch);
              if (isMatch) {
                link.setAttribute('aria-current', 'page');
              } else {
                link.removeAttribute('aria-current');
              }
            });
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      spyObserver.observe(section);
    });
  }

  /* -------------------- Contact form validation -------------------- */
  var form = document.getElementById('contact-form');

  if (form) {
    var statusEl = document.getElementById('form-status');

    var validators = {
      fullname: function (value) {
        return value.trim().length >= 2 ? '' : 'Por favor ingrese su nombre completo.';
      },
      email: function (value) {
        var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(value.trim()) ? '' : 'Ingrese un correo electrónico válido.';
      },
      message: function (value) {
        return value.trim().length >= 10 ? '' : 'Cuéntenos un poco más (mínimo 10 caracteres).';
      }
    };

    function showFieldError(fieldName, message) {
      var errorEl = document.getElementById(fieldName + '-error');
      var inputEl = form.elements[fieldName];
      if (errorEl) {
        errorEl.textContent = message;
      }
      if (inputEl) {
        inputEl.setAttribute('aria-invalid', message ? 'true' : 'false');
      }
    }

    function validateField(fieldName) {
      var inputEl = form.elements[fieldName];
      if (!inputEl || !validators[fieldName]) return true;
      var message = validators[fieldName](inputEl.value);
      showFieldError(fieldName, message);
      return !message;
    }

    ['fullname', 'email', 'message'].forEach(function (fieldName) {
      var inputEl = form.elements[fieldName];
      if (inputEl) {
        inputEl.addEventListener('blur', function () {
          validateField(fieldName);
        });
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var isValid = ['fullname', 'email', 'message']
        .map(validateField)
        .every(Boolean);

      if (!isValid) {
        statusEl.className = 'form-status is-error';
        statusEl.textContent = 'Por favor revise los campos marcados antes de continuar.';
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Honeypot anti-spam: si el campo señuelo viene con contenido, es un bot.
      // Simulamos una confirmación normal para no delatar la trampa, pero no enviamos nada.
      var honeypot = form.elements['_honeypot'];
      if (honeypot && honeypot.value.trim() !== '') {
        statusEl.className = 'form-status is-success';
        statusEl.textContent = 'Gracias. Hemos recibido su solicitud y le responderemos en menos de 24 horas hábiles.';
        form.reset();
        return;
      }

      var submitButton = form.querySelector('button[type="submit"]');
      var originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
      statusEl.className = 'form-status';
      statusEl.textContent = '';

      // Envío real mediante el endpoint AJAX de FormSubmit (https://formsubmit.co/).
      // IMPORTANTE: la primera vez que este formulario reciba un envío real,
      // FormSubmit enviará un correo de activación a contacto@drmasesorias.cl
      // pidiendo confirmar la casilla antes de empezar a reenviar los mensajes.
      var formAction = form.getAttribute('action').replace(
        'https://formsubmit.co/',
        'https://formsubmit.co/ajax/'
      );

      fetch(formAction, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Respuesta no exitosa del servidor de formularios.');
          }
          return response.json();
        })
        .then(function () {
          statusEl.className = 'form-status is-success';
          statusEl.textContent = 'Gracias. Hemos recibido su solicitud y le responderemos en menos de 24 horas hábiles.';
          trackEvent('form_submit', { event_category: 'contacto', event_label: 'formulario_contacto' });
          form.reset();
        })
        .catch(function () {
          statusEl.className = 'form-status is-error';
          statusEl.textContent = 'No pudimos enviar su solicitud en este momento. Por favor, escríbanos directamente a contacto@drmasesorias.cl.';
        })
        .finally(function () {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        });
    });
  }

  /* -------------------- Current year safeguard (footer copyright) -------------------- */
  // El año en el footer se mantiene estático por diseño; actualícelo manualmente
  // o reemplace por lógica dinámica si lo prefiere:
  // document.querySelector('.copyright').textContent = '© ' + new Date().getFullYear() + ' DRM Asesorías. Excelencia en Gestión.';

})();
