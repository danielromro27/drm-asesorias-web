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

  /* Bandera compartida: un deslizamiento (swipe) del carrusel no debe además
     girar la tarjeta que quedó bajo el dedo. El módulo del carrusel la activa. */
  var suppressCaseClick = false;

  /* -------------------- Tarjetas de empresas: efecto flip -------------------- */
  document.querySelectorAll('.case-card--client').forEach(function (card) {
    function toggleFlip() {
      var isFlipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(isFlipped));
    }

    card.addEventListener('click', function () {
      if (suppressCaseClick) { return; }
      toggleFlip();
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFlip();
      }
    });
  });

  /* -------------------- Carrusel de empresas --------------------
     Dos grupos de tarjetas con transición automática cada 8 s. La reproducción
     se pausa al pasar el cursor, al enfocar con el teclado o al girar una
     tarjeta, y se reanuda reiniciando el temporizador cuando termina la
     interacción. Sin JS, los grupos quedan apilados y accesibles. */
  var casesCarousel = document.querySelector('[data-cases-carousel]');

  if (casesCarousel) {
    var casesTrack = casesCarousel.querySelector('.cases-track');
    var casesSlides = Array.prototype.slice.call(casesCarousel.querySelectorAll('.cases-slide'));
    var casesDots = Array.prototype.slice.call(casesCarousel.querySelectorAll('.cases-dot'));

    if (casesTrack && casesSlides.length > 1) {
      var CASES_AUTOPLAY_MS = 8000;
      var casesIndex = 0;
      var casesTimer = null;
      var casesHovering = false;
      var casesFocusWithin = false;

      casesCarousel.classList.add('is-ready');

      var anyCaseFlipped = function () {
        return casesCarousel.querySelector('.case-card--client.is-flipped') !== null;
      };

      var canCasesAutoplay = function () {
        return !prefersReducedMotion && !casesHovering && !casesFocusWithin && !anyCaseFlipped();
      };

      var applyCasesState = function () {
        var offset = casesIndex * (casesSlides[0].getBoundingClientRect().width || 0);
        casesTrack.style.transform = 'translateX(' + (-offset) + 'px)';

        casesSlides.forEach(function (slide, i) {
          var active = i === casesIndex;
          /* 'inert' oculta el grupo inactivo del foco y de la accesibilidad en
             navegadores modernos; el tabindex asegura el mismo comportamiento
             de foco en navegadores sin soporte de 'inert'. */
          slide.inert = !active;
          slide.querySelectorAll('.case-card--client').forEach(function (card) {
            card.setAttribute('tabindex', active ? '0' : '-1');
          });
        });

        casesDots.forEach(function (dot, i) {
          var active = i === casesIndex;
          dot.classList.toggle('is-active', active);
          if (active) {
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.removeAttribute('aria-current');
          }
        });
      };

      var scheduleCases = function () {
        if (casesTimer) {
          window.clearTimeout(casesTimer);
          casesTimer = null;
        }
        if (canCasesAutoplay()) {
          casesTimer = window.setTimeout(function () {
            goToCase((casesIndex + 1) % casesSlides.length);
            scheduleCases();
          }, CASES_AUTOPLAY_MS);
        }
      };

      function goToCase(i) {
        casesIndex = (i + casesSlides.length) % casesSlides.length;
        applyCasesState();
      }

      casesDots.forEach(function (dot, i) {
        dot.addEventListener('click', function () {
          goToCase(i);
          scheduleCases();
        });
      });

      casesCarousel.addEventListener('mouseenter', function () { casesHovering = true; scheduleCases(); });
      casesCarousel.addEventListener('mouseleave', function () { casesHovering = false; scheduleCases(); });
      casesCarousel.addEventListener('focusin', function () { casesFocusWithin = true; scheduleCases(); });
      casesCarousel.addEventListener('focusout', function (event) {
        if (!casesCarousel.contains(event.relatedTarget)) {
          casesFocusWithin = false;
        }
        scheduleCases();
      });
      /* Girar una tarjeta (click o teclado) recalcula el estado de reproducción. */
      casesCarousel.addEventListener('click', scheduleCases);
      casesCarousel.addEventListener('keyup', scheduleCases);

      /* Pausa mientras la pestaña no está visible; reanuda al volver. */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          if (casesTimer) { window.clearTimeout(casesTimer); casesTimer = null; }
        } else {
          scheduleCases();
        }
      });

      /* -------------------- Deslizar con el dedo (swipe) --------------------
         Cambia de grupo arrastrando horizontalmente, sin perder los dots.
         Bloqueo de eje: si el gesto es vertical, se respeta el scroll normal
         de la página; si es horizontal, la pista sigue al dedo y hace "snap"
         al soltar. La CSS 'touch-action: pan-y' habilita esta convivencia. */
      var casesDragging = false;
      var casesAxis = null; /* 'x' | 'y' | null */
      var casesStartX = 0;
      var casesStartY = 0;
      var casesDX = 0;
      var casesSlideW = 0;

      var casesBaseOffset = function () {
        return -casesIndex * (casesSlides[0].getBoundingClientRect().width || 0);
      };

      casesTrack.addEventListener('touchstart', function (event) {
        if (event.touches.length !== 1) { return; }
        casesDragging = true;
        casesAxis = null;
        casesStartX = event.touches[0].clientX;
        casesStartY = event.touches[0].clientY;
        casesDX = 0;
        casesSlideW = casesSlides[0].getBoundingClientRect().width || 0;
        casesTrack.style.transition = 'none';
      }, { passive: true });

      casesTrack.addEventListener('touchmove', function (event) {
        if (!casesDragging || event.touches.length !== 1) { return; }
        var dx = event.touches[0].clientX - casesStartX;
        var dy = event.touches[0].clientY - casesStartY;
        if (casesAxis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          casesAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        if (casesAxis !== 'x') { return; }
        casesDX = dx;
        var maxOffset = 0;
        var minOffset = -(casesSlides.length - 1) * casesSlideW;
        var target = casesBaseOffset() + dx;
        /* Resistencia elástica en los extremos. */
        if (target > maxOffset) { target = maxOffset + (target - maxOffset) * 0.35; }
        if (target < minOffset) { target = minOffset + (target - minOffset) * 0.35; }
        casesTrack.style.transform = 'translateX(' + target + 'px)';
      }, { passive: true });

      var endCasesDrag = function () {
        if (!casesDragging) { return; }
        casesDragging = false;
        casesTrack.style.transition = '';
        if (casesAxis === 'x') {
          /* Gesto horizontal: se evita que el "click" sintético gire la tarjeta. */
          suppressCaseClick = true;
          window.setTimeout(function () { suppressCaseClick = false; }, 400);
          var threshold = Math.min(80, casesSlideW * 0.18);
          if (casesDX <= -threshold && casesIndex < casesSlides.length - 1) {
            goToCase(casesIndex + 1);
          } else if (casesDX >= threshold && casesIndex > 0) {
            goToCase(casesIndex - 1);
          } else {
            applyCasesState();
          }
          scheduleCases();
        }
        casesAxis = null;
      };

      casesTrack.addEventListener('touchend', endCasesDrag, { passive: true });
      casesTrack.addEventListener('touchcancel', endCasesDrag, { passive: true });

      /* Recalcula el desplazamiento al cambiar el ancho (sin animar el reajuste). */
      var casesResizeRaf = null;
      window.addEventListener('resize', function () {
        if (casesResizeRaf) { window.cancelAnimationFrame(casesResizeRaf); }
        casesResizeRaf = window.requestAnimationFrame(function () {
          var prev = casesTrack.style.transition;
          casesTrack.style.transition = 'none';
          applyCasesState();
          /* Fuerza reflow para restaurar la transición sin animar el reajuste. */
          void casesTrack.offsetWidth;
          casesTrack.style.transition = prev;
        });
      }, { passive: true });

      applyCasesState();
      scheduleCases();
    }
  }

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
      },
      phone: function (value) {
        var v = value.trim();
        return /^[0-9+()\s-]{8,}$/.test(v) ? '' : 'Ingrese un teléfono de contacto válido.';
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

    ['fullname', 'email', 'phone', 'message'].forEach(function (fieldName) {
      var inputEl = form.elements[fieldName];
      if (inputEl) {
        inputEl.addEventListener('blur', function () {
          validateField(fieldName);
        });
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var isValid = ['fullname', 'email', 'phone', 'message']
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
      /* Evita envíos múltiples mientras se procesa la solicitud. */
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
      statusEl.className = 'form-status';
      statusEl.textContent = '';

      /* Envío real vía Web3Forms (https://web3forms.com), ideal para sitios
         estáticos. La access_key es PÚBLICA (segura de exponer en el HTML).
         Si aún no se ha configurado, avisamos con un error claro y una nota en
         consola para quien administra el sitio. */
      var accessKeyEl = form.elements['access_key'];
      var accessKey = accessKeyEl ? String(accessKeyEl.value).trim() : '';
      if (!accessKey || accessKey.indexOf('PEGA_AQUI') !== -1) {
        console.error('[DRM] Falta la access_key de Web3Forms. Obtenla gratis en https://web3forms.com y pégala en el <input type="hidden" name="access_key"> del formulario.');
        statusEl.className = 'form-status is-error';
        statusEl.textContent = 'No pudimos enviar su solicitud en este momento. Por favor, escríbanos directamente a contacto@drmasesorias.cl.';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        return;
      }

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.success) {
            statusEl.className = 'form-status is-success';
            statusEl.textContent = 'Gracias. Hemos recibido su solicitud y le responderemos en menos de 24 horas hábiles.';
            trackEvent('form_submit', { event_category: 'contacto', event_label: 'formulario_contacto' });
            form.reset();
          } else {
            throw new Error((result.data && result.data.message) || 'Respuesta no exitosa del servidor de formularios.');
          }
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
