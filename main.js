/* ─────────────────────────────────────────
   HILTONIA — main.js
   ───────────────────────────────────────── */

const config = window.HILTONIA_CONFIG || {};
const supabaseClient = (window.supabase && config.SUPABASE_URL && config.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

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
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  });
});

// ── PROPERTIES: load from Supabase and render ──
const propGrid       = document.getElementById('prop-grid');
const bookingSelect  = document.getElementById('prop-select');
const contactSelect  = document.getElementById('cf-property');
const heroPropCount  = document.querySelector('.stat-num');

let properties = [];

const GRADIENTS = [
  'linear-gradient(135deg,#1a3a2e,#2d5a46,#0d2018)',
  'linear-gradient(135deg,#1e2e1e,#3a5a3a,#0a1a0a)',
  'linear-gradient(135deg,#2a3a4a,#3d5a6e,#1a2a38)',
  'linear-gradient(135deg,#3a2a1a,#5a4a2e,#2a1a0a)',
  'linear-gradient(135deg,#2a1a2e,#4a3a5a,#1a0a20)',
];

function renderProperties() {
  if (!propGrid) return;

  if (properties.length === 0) {
    propGrid.innerHTML = '<p class="properties-empty">No properties available right now — check back soon.</p>';
    return;
  }

  propGrid.innerHTML = properties.map((p, i) => `
    <article class="prop-card${p.featured ? ' large' : ''}">
      ${p.image_url
        ? `<img src="${p.image_url}" alt="${p.name}" class="prop-img" />`
        : `<div class="prop-placeholder" style="background:${GRADIENTS[i % GRADIENTS.length]};"></div>`
      }
      <div class="prop-badge">From $${Number(p.price_per_night).toFixed(0)} / night</div>
      <div class="prop-overlay">
        <span class="prop-type">${p.type} · ${p.bedrooms} Bedroom${p.bedrooms > 1 ? 's' : ''}</span>
        <h3 class="prop-name">${p.name}</h3>
        <p class="prop-location">${p.location}, ${p.province}</p>
        <a href="#booking" class="prop-link" data-property-id="${p.id}">Reserve →</a>
      </div>
    </article>
  `).join('');

  propGrid.querySelectorAll('.prop-link').forEach(link => {
    link.addEventListener('click', () => {
      if (bookingSelect) bookingSelect.value = link.dataset.propertyId;
    });
  });
}

function populateSelects() {
  const options = properties
    .map(p => `<option value="${p.id}">${p.name} — ${p.location}</option>`)
    .join('');

  if (bookingSelect) {
    bookingSelect.innerHTML = '<option value="" disabled selected>Select a property</option>' + options;
  }
  if (contactSelect) {
    contactSelect.innerHTML = options + '<option value="" selected>General enquiry</option>';
  }
}

async function loadProperties() {
  if (!supabaseClient) {
    console.warn('Supabase is not configured — copy js/config.example.js to js/config.js and fill in your project details.');
    if (propGrid) propGrid.innerHTML = '<p class="properties-empty">Properties are not configured yet.</p>';
    return;
  }

  const { data, error } = await supabaseClient
    .from('properties')
    .select('*')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load properties:', error);
    if (propGrid) propGrid.innerHTML = '<p class="properties-empty">Couldn\'t load properties right now.</p>';
    return;
  }

  properties = data || [];
  if (heroPropCount) heroPropCount.textContent = properties.length;
  renderProperties();
  populateSelects();
}

loadProperties();

function setStatus(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-status' + (isError ? ' error' : '');
}

// ── BOOKING FORM: create a Stripe checkout session via the backend ──
const bookingForm   = document.getElementById('booking-form');
const bookingStatus = document.getElementById('booking-status');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const propertyId = bookingForm.elements['property'].value;
    const checkin     = bookingForm.elements['checkin'].value;
    const checkout    = bookingForm.elements['checkout'].value;
    const guestName   = bookingForm.elements['guestName'].value.trim();
    const guestEmail  = bookingForm.elements['guestEmail'].value.trim();

    if (!propertyId || !checkin || !checkout || !guestName || !guestEmail) {
      setStatus(bookingStatus, 'Please fill in all fields.', true);
      return;
    }

    if (!config.BACKEND_URL) {
      setStatus(bookingStatus, 'Booking is not configured yet — please email us directly.', true);
      return;
    }

    setStatus(bookingStatus, 'Checking availability…', false);

    try {
      const res = await fetch(`${config.BACKEND_URL}/api/bookings/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, checkin, checkout, guestName, guestEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(bookingStatus, data.error || 'Something went wrong.', true);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setStatus(bookingStatus, 'Network error — please try again or email us directly.', true);
    }
  });
}

// ── CONTACT FORM: send to the backend, which stores it and emails the team ──
const contactForm = document.getElementById('contact-form');
const formStatus  = document.getElementById('form-status');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name        = contactForm.elements['name'].value.trim();
    const email       = contactForm.elements['email'].value.trim();
    const propertyId  = contactForm.elements['property'].value;
    const message     = contactForm.elements['message'].value.trim();

    if (!name || !email || !message) {
      setStatus(formStatus, 'Please fill in your name, email, and message.', true);
      return;
    }

    if (!config.BACKEND_URL) {
      setStatus(formStatus, 'Contact form is not configured yet — please email us directly.', true);
      return;
    }

    setStatus(formStatus, 'Sending…', false);

    try {
      const res = await fetch(`${config.BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, propertyId: propertyId || null, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(formStatus, data.error || 'Something went wrong.', true);
        return;
      }

      setStatus(formStatus, "Message sent — we'll reply within 2 hours.", false);
      contactForm.reset();
    } catch (err) {
      console.error(err);
      setStatus(formStatus, 'Something went wrong. Please email us directly.', true);
    }
  });
}

// ── BOOKING: enforce checkout > checkin ──
const checkinInput  = document.getElementById('checkin');
const checkoutInput = document.getElementById('checkout');

if (checkinInput && checkoutInput) {
  const today = new Date().toISOString().split('T')[0];
  checkinInput.min = today;

  checkinInput.addEventListener('change', () => {
    if (checkinInput.value) {
      checkoutInput.min = checkinInput.value;
      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = '';
      }
    }
  });
}

// ── BOOKING: show a status banner after returning from Stripe checkout ──
const params = new URLSearchParams(window.location.search);
if (params.get('booking') === 'success') {
  setStatus(bookingStatus, 'Booking confirmed! Check your email for details.', false);
} else if (params.get('booking') === 'cancelled') {
  setStatus(bookingStatus, 'Checkout was cancelled — no charge was made.', true);
}
