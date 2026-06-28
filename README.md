# Hiltonia Website

A modern, minimal rental website for apartments and villas in Sri Lanka.

## Files

```
hiltonia/
├── index.html   — all sections and markup
├── style.css    — all styles (desktop + responsive)
├── main.js      — nav scroll, mobile menu, form handling
└── images/      — (you create this) put your photos here
```

## Quick start

Just open `index.html` in a browser. No build step needed.

---

## Adding your photos

### Hero image
In `index.html`, find the `<!-- REPLACE hero-bg -->` comment and add:
```html
<img src="images/hero.jpg" alt="Hiltonia hero" class="hero-img" />
```
The `.hero-bg` placeholder will hide automatically.

### Property card images
Each `.prop-card` has a `.prop-placeholder` div. Replace it with:
```html
<img src="images/palm-residence.jpg" alt="The Palm Residence" class="prop-img" />
```

Recommended image sizes:
- Hero: 1920 × 1080px minimum
- Large property card: 800 × 1200px
- Small property cards: 800 × 600px

---

## Adding more property cards

Copy any `<article class="prop-card">` block in `index.html`.
For a featured (tall) card, add the `large` class:
```html
<article class="prop-card large">
```

---

## Making the forms work

### Option A — Formspree (free, no backend needed)
1. Sign up at https://formspree.io
2. Create a form, copy your endpoint (e.g. `https://formspree.io/f/xyzabcde`)
3. In `main.js`, uncomment the Formspree fetch blocks and paste your endpoint
4. Remove the `mailto` lines above them

### Option B — EmailJS (sends from browser, no server)
See https://www.emailjs.com/docs/

### Option C — WhatsApp redirect
Replace the form submit handler with:
```js
const text = encodeURIComponent(`Hi, I'm interested in ${property}`);
window.open(`https://wa.me/94771234567?text=${text}`, '_blank');
```

---

## Replacing placeholder content

Search `index.html` for these and update:

| Placeholder | Replace with |
|---|---|
| `hello@hiltonia.lk` | Your real email |
| `+94 77 123 4567` | Your WhatsApp number |
| `Colombo 03, Western Province` | Your office address |
| `12` (hero stat) | Your actual property count |
| Property names & prices | Your real listings |

---

## Deployment

Any static host works. Recommended free options:
- **Netlify** — drag the folder to https://app.netlify.com/drop
- **Vercel** — `npx vercel` in the folder
- **GitHub Pages** — push to a repo and enable Pages

For a `.lk` domain, register at https://www.nic.lk
