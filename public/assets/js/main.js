// FD Anwaltskanzlei AG – kleines, abhängigkeitsfreies Script
(function () {
  'use strict';

  // ---------- Mobile Navigation ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('hauptnavigation');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  // ---------- Header-Schatten beim Scrollen ----------
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Dezentes Einblenden ----------
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var items = document.querySelectorAll('.area-card, .step, .service, .info-card, .contact-card');
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -40px 0px' }
    );
    items.forEach(function (el) {
      // Bereits sichtbare Elemente nicht verstecken (kein Flackern beim Laden)
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // ---------- Kontaktformular ----------
  var form = document.querySelector('.contact-form');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var messages = {
    name: 'Bitte geben Sie Ihren Namen an.',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
    nachricht: 'Bitte beschreiben Sie kurz Ihr Anliegen.',
    einwilligung: 'Bitte bestätigen Sie die Einwilligung.'
  };

  function setStatus(text, type) {
    status.textContent = text;
    status.className = 'form-status' + (type ? ' is-' + type : '');
  }

  function showError(field, show) {
    var id = field.id + '-error';
    var existing = document.getElementById(id);
    if (show) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', id);
      if (!existing) {
        var msg = document.createElement('p');
        msg.id = id;
        msg.className = 'field-error';
        msg.textContent = messages[field.name] || 'Bitte prüfen Sie dieses Feld.';
        field.closest('.field').appendChild(msg);
      }
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      if (existing) existing.remove();
    }
  }

  function validate() {
    var firstInvalid = null;
    form.querySelectorAll('[required]').forEach(function (field) {
      var valid = field.type === 'checkbox' ? field.checked : field.value.trim() !== '' && field.checkValidity();
      showError(field, !valid);
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') {
      var f = e.target;
      var ok = f.type === 'checkbox' ? f.checked : f.value.trim() !== '' && f.checkValidity();
      if (ok) showError(f, false);
    }
  });
  form.addEventListener('change', function (e) {
    if (e.target.type === 'checkbox' && e.target.checked) showError(e.target, false);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('');
    if (!validate()) {
      setStatus('Bitte füllen Sie die markierten Felder aus.', 'error');
      return;
    }
    var data = new FormData(form);
    if (data.get('_gotcha')) return; // Spam-Schutz
    var endpoint = form.getAttribute('data-endpoint');
    var email = form.getAttribute('data-email');

    // Variante 1: Formulardienst (z. B. Formspree)
    if (endpoint) {
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      setStatus('Wird gesendet …');
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          setStatus('Vielen Dank! Ihre Anfrage ist eingegangen. Ich melde mich so rasch wie möglich bei Ihnen.', 'success');
        })
        .catch(function () {
          setStatus('Die Anfrage konnte leider nicht gesendet werden. Bitte versuchen Sie es erneut oder rufen Sie an.', 'error');
        })
        .finally(function () {
          button.disabled = false;
        });
      return;
    }

    // Variante 2: Ohne Formulardienst – E-Mail-Programm mit vorausgefüllter Nachricht öffnen
    if (email) {
      var body =
        'Name: ' + data.get('name') + '\n' +
        'E-Mail: ' + data.get('email') + '\n' +
        'Telefon: ' + (data.get('telefon') || '-') + '\n' +
        'Rechtsgebiet: ' + (data.get('rechtsgebiet') || '-') + '\n\n' +
        data.get('nachricht');
      var subject = 'Anfrage' + (data.get('rechtsgebiet') ? ' – ' + data.get('rechtsgebiet') : '') + ' – ' + data.get('name');
      window.location.href =
        'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      setStatus('Ihr E-Mail-Programm wurde mit Ihrer Anfrage geöffnet. Bitte senden Sie die Nachricht dort ab.', 'success');
      return;
    }

    setStatus('Das Formular ist noch nicht eingerichtet. Bitte kontaktieren Sie die Kanzlei telefonisch.', 'error');
  });
})();
