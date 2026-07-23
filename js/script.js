/**
 * DRM Asesorías — interacciones del sitio
 * Vanilla JS, sin dependencias externas.
 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

      // NOTA PARA EL EQUIPO DE DRM ASESORÍAS:
      // Este formulario valida los datos en el navegador pero, al no existir
      // un backend propio, no envía la información a ningún servidor todavía.
      // Para recibir estos mensajes en su correo, conecte este formulario a un
      // servicio como Formspree, Web3Forms o su propio endpoint, y reemplace
      // el bloque de abajo por el envío real (fetch/POST).
      var submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';

      window.setTimeout(function () {
        statusEl.className = 'form-status is-success';
        statusEl.textContent = 'Gracias. Hemos recibido su solicitud y le responderemos en menos de 24 horas hábiles.';
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar solicitud de contacto';
        form.reset();
      }, 600);
    });
  }

  /* -------------------- Current year safeguard (footer copyright) -------------------- */
  // El año en el footer se mantiene estático por diseño; actualícelo manualmente
  // o reemplace por lógica dinámica si lo prefiere:
  // document.querySelector('.copyright').textContent = '© ' + new Date().getFullYear() + ' DRM Asesorías. Excelencia en Gestión.';

})();
