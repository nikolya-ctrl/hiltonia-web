-- ─────────────────────────────────────────
-- HILTONIA — Supabase schema
-- Run this in the Supabase SQL editor (SQL Editor → New query).
-- ─────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── TABLES ──

create table if not exists properties (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text unique not null,
  type             text not null,                 -- Villa / Apartment / House
  bedrooms         int not null default 1,
  location         text not null,
  province         text not null,
  price_per_night  numeric(10,2) not null,
  description      text,
  image_url        text,
  featured         boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references properties(id) on delete cascade,
  guest_name       text not null,
  guest_email      text not null,
  checkin          date not null,
  checkout         date not null,
  nights           int not null,
  amount_total     numeric(10,2) not null,
  status           text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  stripe_session_id text,
  created_at       timestamptz not null default now(),
  constraint checkout_after_checkin check (checkout > checkin)
);

create table if not exists enquiries (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  property_id      uuid references properties(id) on delete set null,
  message          text not null,
  status           text not null default 'new' check (status in ('new', 'responded')),
  created_at       timestamptz not null default now()
);

create index if not exists bookings_property_dates_idx
  on bookings (property_id, checkin, checkout);

-- ── ROW LEVEL SECURITY ──
-- The backend writes bookings/enquiries with the service role key, which
-- bypasses RLS entirely — so no insert policy is needed for anon/authenticated
-- on those two tables. The admin panel reads/writes as an authenticated
-- Supabase Auth user (the one admin account you create by hand).

alter table properties enable row level security;
alter table bookings   enable row level security;
alter table enquiries  enable row level security;

create policy "Public can view active properties"
  on properties for select
  using (active = true);

create policy "Authenticated can manage properties"
  on properties for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated can view bookings"
  on bookings for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can update bookings"
  on bookings for update
  using (auth.role() = 'authenticated');

create policy "Authenticated can view enquiries"
  on enquiries for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can update enquiries"
  on enquiries for update
  using (auth.role() = 'authenticated');

-- ── STORAGE (property images) ──

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "Public read property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Authenticated upload property images"
  on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated update property images"
  on storage.objects for update
  using (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated delete property images"
  on storage.objects for delete
  using (bucket_id = 'property-images' and auth.role() = 'authenticated');

-- ── SEED: current real listings ──

insert into properties (name, slug, type, bedrooms, location, province, price_per_night, description, featured)
values
  ('Hill Country Villa',       'hill-country-villa',       'Villa',      2, 'Nuwara Eliya',   'Central Province',  110, 'A colonial-era villa in the hill country with cool mountain air and rolling tea estate views.', true),
  ('Tea Country Apartment',    'tea-country-apartment',    'Apartment',  2, 'Nuwara Eliya',   'Central Province',  65,  'A cosy apartment set among tea estates at 1,800m elevation.', false),
  ('Mount Lavinia Apartment',  'mount-lavinia-apartment',  'Apartment',  1, 'Mount Lavinia',  'Western Province',  55,  'A seafront apartment minutes from Colombo with golden sunsets.', false),
  ('Talpe Coastal Apartment',  'talpe-coastal-apartment',  'Apartment',  1, 'Talpe',          'Galle',             70,  'Steps from the beach in a quiet coastal village near Galle Fort.', false),
  ('Negombo House',            'negombo-house',            'House',      2, 'Negombo',        'Western Province',  60,  'A lagoon-town house close to the Dutch canal and fish market.', false)
on conflict (slug) do nothing;
