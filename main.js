/* ─────────────────────────────────────────
   HILTONIA — main.js
   ───────────────────────────────────────── */

// ── NAV: scroll → solid background ──
const nav      = document.getElementById('main-nav');
const burger   = document.getElementById('nav-burger');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 80);
});

// ── NAV: mobile burger toggle ──
burger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  // prevent body scroll while menu is open
  document.body.style.overflow = open ? 'hidden' : '';
});

// Close mobile nav when a link is tapped
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  });
});

// ── BOOKING FORM ──
// Default behaviour: opens a mailto with the selected values.
// Replace the handler body with a real API call (Formspree, EmailJS, etc.)
const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const property = bookingForm.elements['property'].value;
    const checkin  = bookingForm.elements['checkin'].value;
    const checkout = bookingForm.elements['checkout'].value;

    if (!property || !checkin || !checkout) {
      alert('Please fill in all fields.');
      return;
    }

    // ── OPTION A: mailto fallback (works without a backend) ──
    const subject = encodeURIComponent(`Booking enquiry — ${property}`);
    const body    = encodeURIComponent(
      `Property: ${property}\nCheck-in: ${checkin}\nCheck-out: ${checkout}`
    );
    window.location.href = `mailto:hello@hiltonia.lk?subject=${subject}&body=${body}`;

    // ── OPTION B: Formspree (uncomment + add your endpoint) ──
    // fetch('https://formspree.io/f/YOUR_ID', {
    //   method: 'POST',
    //   headers: { 'Accept': 'application/json' },
    //   body: new FormData(bookingForm),
    // })
    // .then(r => r.ok ? alert('Request sent! We'll be in touch soon.') : alert('Something went wrong.'))
    // .catch(() => alert('Network error — please email us directly.'));
  });
}

// ── CONTACT FORM ──
const contactForm = document.getElementById('contact-form');
const formStatus  = document.getElementById('form-status');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name     = contactForm.elements['name'].value.trim();
    const email    = contactForm.elements['email'].value.trim();
    const property = contactForm.elements['property'].value;
    const message  = contactForm.elements['message'].value.trim();

    if (!name || !email || !message) {
      formStatus.textContent = 'Please fill in your name, email, and message.';
      formStatus.className   = 'form-status error';
      return;
    }

    // ── OPTION A: mailto fallback ──
    const subject = encodeURIComponent(`Hiltonia enquiry from ${name}`);
    const body    = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nProperty: ${property || 'Not specified'}\n\n${message}`
    );
    window.location.href = `mailto:hello@hiltonia.lk?subject=${subject}&body=${body}`;

    formStatus.textContent = 'Opening your email client…';
    formStatus.className   = 'form-status';

    // ── OPTION B: Formspree ──
    // formStatus.textContent = 'Sending…';
    // fetch('https://formspree.io/f/YOUR_ID', {
    //   method: 'POST',
    //   headers: { 'Accept': 'application/json' },
    //   body: new FormData(contactForm),
    // })
    // .then(r => {
    //   if (r.ok) {
    //     formStatus.textContent = 'Message sent — we'll reply within 2 hours.';
    //     formStatus.className   = 'form-status';
    //     contactForm.reset();
    //   } else {
    //     throw new Error();
    //   }
    // })
    // .catch(() => {
    //   formStatus.textContent = 'Something went wrong. Please email us directly.';
    //   formStatus.className   = 'form-status error';
    // });
  });
}

// ── BOOKING: enforce checkout > checkin ──
const checkinInput  = document.getElementById('checkin');
const checkoutInput = document.getElementById('checkout');

if (checkinInput && checkoutInput) {
  // Set today as the minimum check-in date
  const today = new Date().toISOString().split('T')[0];
  checkinInput.min = today;

  checkinInput.addEventListener('change', () => {
    if (checkinInput.value) {
      checkoutInput.min = checkinInput.value;
      // If checkout is before new checkin, reset it
      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = '';
      }
    }
  });
}
