/* ─────────────────────────────────────────
   HILTONIA — admin.js
   ───────────────────────────────────────── */

const config = window.HILTONIA_CONFIG || {};

if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  document.body.innerHTML = '<p style="padding:3rem;font-family:sans-serif;">Supabase is not configured — copy js/config.example.js to js/config.js and fill in your project details.</p>';
  throw new Error('Supabase not configured');
}

const supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

const loginSection = document.getElementById('admin-login');
const dashboard     = document.getElementById('admin-dashboard');
const loginForm     = document.getElementById('login-form');
const loginStatus   = document.getElementById('login-status');
const userEmailEl   = document.getElementById('admin-user-email');

function setStatus(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-status' + (isError ? ' error' : '');
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── AUTH ──

async function showDashboardIfSignedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    loginSection.hidden = true;
    dashboard.hidden = false;
    userEmailEl.textContent = session.user.email;
    loadProperties();
    loadBookings();
    loadEnquiries();
  } else {
    loginSection.hidden = false;
    dashboard.hidden = true;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  setStatus(loginStatus, 'Signing in…', false);

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setStatus(loginStatus, error.message, true);
    return;
  }

  setStatus(loginStatus, '', false);
  showDashboardIfSignedIn();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showDashboardIfSignedIn();
});

// ── TABS ──

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.hidden = true);
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
  });
});

// ── PROPERTIES ──

const propertyForm       = document.getElementById('property-form');
const propertiesTableBody = document.querySelector('#properties-table tbody');
let propertiesCache = [];

document.getElementById('new-property-btn').addEventListener('click', () => {
  resetPropertyForm();
  propertyForm.hidden = false;
});

document.getElementById('cancel-property-btn').addEventListener('click', () => {
  propertyForm.hidden = true;
});

function resetPropertyForm() {
  document.getElementById('pf-id').value = '';
  document.getElementById('pf-name').value = '';
  document.getElementById('pf-slug').value = '';
  document.getElementById('pf-type').value = 'Villa';
  document.getElementById('pf-bedrooms').value = 1;
  document.getElementById('pf-location').value = '';
  document.getElementById('pf-province').value = '';
  document.getElementById('pf-price').value = '';
  document.getElementById('pf-description').value = '';
  document.getElementById('pf-image').value = '';
  document.getElementById('pf-featured').checked = false;
  document.getElementById('pf-active').checked = true;
  setStatus(document.getElementById('property-form-status'), '', false);
}

async function loadProperties() {
  const { data, error } = await supabaseClient
    .from('properties')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  propertiesCache = data || [];

  propertiesTableBody.innerHTML = propertiesCache.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.location)}</td>
      <td>$${Number(p.price_per_night).toFixed(0)}</td>
      <td>${p.active ? 'Yes' : 'No'}</td>
      <td class="admin-row-actions">
        <button class="btn-outline" data-edit="${p.id}">Edit</button>
        <button class="btn-outline" data-delete="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No properties yet.</td></tr>';

  propertiesTableBody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editProperty(btn.dataset.edit));
  });
  propertiesTableBody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteProperty(btn.dataset.delete));
  });
}

function editProperty(id) {
  const p = propertiesCache.find(x => x.id === id);
  if (!p) return;

  document.getElementById('pf-id').value = p.id;
  document.getElementById('pf-name').value = p.name;
  document.getElementById('pf-slug').value = p.slug;
  document.getElementById('pf-type').value = p.type;
  document.getElementById('pf-bedrooms').value = p.bedrooms;
  document.getElementById('pf-location').value = p.location;
  document.getElementById('pf-province').value = p.province;
  document.getElementById('pf-price').value = p.price_per_night;
  document.getElementById('pf-description').value = p.description || '';
  document.getElementById('pf-image').value = '';
  document.getElementById('pf-featured').checked = p.featured;
  document.getElementById('pf-active').checked = p.active;

  propertyForm.hidden = false;
  propertyForm.scrollIntoView({ behavior: 'smooth' });
}

async function deleteProperty(id) {
  if (!confirm('Delete this property? This cannot be undone.')) return;

  const { error } = await supabaseClient.from('properties').delete().eq('id', id);
  if (error) {
    alert(error.message);
    return;
  }
  loadProperties();
}

propertyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById('property-form-status');
  setStatus(statusEl, 'Saving…', false);

  const id = document.getElementById('pf-id').value;
  const slug = document.getElementById('pf-slug').value.trim();

  const payload = {
    name: document.getElementById('pf-name').value.trim(),
    slug,
    type: document.getElementById('pf-type').value,
    bedrooms: Number(document.getElementById('pf-bedrooms').value),
    location: document.getElementById('pf-location').value.trim(),
    province: document.getElementById('pf-province').value.trim(),
    price_per_night: Number(document.getElementById('pf-price').value),
    description: document.getElementById('pf-description').value.trim(),
    featured: document.getElementById('pf-featured').checked,
    active: document.getElementById('pf-active').checked,
  };

  const imageFile = document.getElementById('pf-image').files[0];
  if (imageFile) {
    const ext = imageFile.name.split('.').pop();
    const path = `${slug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('property-images')
      .upload(path, imageFile, { upsert: true });

    if (uploadError) {
      setStatus(statusEl, uploadError.message, true);
      return;
    }

    const { data: urlData } = supabaseClient.storage.from('property-images').getPublicUrl(path);
    payload.image_url = urlData.publicUrl;
  }

  const query = id
    ? supabaseClient.from('properties').update(payload).eq('id', id)
    : supabaseClient.from('properties').insert(payload);

  const { error } = await query;

  if (error) {
    setStatus(statusEl, error.message, true);
    return;
  }

  setStatus(statusEl, 'Saved.', false);
  propertyForm.hidden = true;
  loadProperties();
});

// ── BOOKINGS ──

const bookingsTableBody = document.querySelector('#bookings-table tbody');

async function loadBookings() {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('*, properties(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  bookingsTableBody.innerHTML = (data || []).map(b => `
    <tr>
      <td>${escapeHtml(b.guest_name)}<br><span class="admin-sub">${escapeHtml(b.guest_email)}</span></td>
      <td>${escapeHtml(b.properties?.name || '—')}</td>
      <td>${b.checkin} → ${b.checkout}</td>
      <td>$${Number(b.amount_total).toFixed(2)}</td>
      <td><span class="admin-badge admin-badge-${b.status}">${b.status}</span></td>
      <td class="admin-row-actions">
        ${b.status !== 'cancelled' ? `<button class="btn-outline" data-cancel-booking="${b.id}">Cancel</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">No bookings yet.</td></tr>';

  bookingsTableBody.querySelectorAll('[data-cancel-booking]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this booking?')) return;
      const { error } = await supabaseClient
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', btn.dataset.cancelBooking);
      if (error) { alert(error.message); return; }
      loadBookings();
    });
  });
}

// ── ENQUIRIES ──

const enquiriesTableBody = document.querySelector('#enquiries-table tbody');

async function loadEnquiries() {
  const { data, error } = await supabaseClient
    .from('enquiries')
    .select('*, properties(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  enquiriesTableBody.innerHTML = (data || []).map(en => `
    <tr>
      <td>${escapeHtml(en.name)}<br><span class="admin-sub">${escapeHtml(en.email)}</span></td>
      <td>${escapeHtml(en.properties?.name || 'General')}</td>
      <td>${escapeHtml(en.message)}</td>
      <td><span class="admin-badge admin-badge-${en.status}">${en.status}</span></td>
      <td class="admin-row-actions">
        ${en.status === 'new' ? `<button class="btn-outline" data-respond="${en.id}">Mark responded</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No enquiries yet.</td></tr>';

  enquiriesTableBody.querySelectorAll('[data-respond]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabaseClient
        .from('enquiries')
        .update({ status: 'responded' })
        .eq('id', btn.dataset.respond);
      if (error) { alert(error.message); return; }
      loadEnquiries();
    });
  });
}

showDashboardIfSignedIn();
