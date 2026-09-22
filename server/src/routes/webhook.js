import { Router } from 'express';
import { stripe } from '../lib/stripe.js';
import { supabase } from '../lib/supabase.js';
import { sendEmail } from '../lib/email.js';

const router = Router();

// Mounted with express.raw() in index.js — Stripe's signature check needs
// the untouched request body, not the JSON-parsed one.
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const { data: booking, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .select('*, properties(name, location)')
        .single();

      if (error) {
        console.error('Failed to confirm booking:', error);
      } else if (booking) {
        await sendEmail({
          to: booking.guest_email,
          subject: `Booking confirmed — ${booking.properties.name}`,
          html: `<p>Hi ${booking.guest_name},</p>
                 <p>Your booking at <strong>${booking.properties.name}</strong> (${booking.properties.location}) is confirmed.</p>
                 <p>Check-in: ${booking.checkin}<br>Check-out: ${booking.checkout}<br>Total paid: $${booking.amount_total}</p>
                 <p>We'll be in touch with arrival details soon.</p>`,
        });

        await sendEmail({
          to: process.env.ADMIN_NOTIFY_EMAIL,
          subject: `New confirmed booking — ${booking.properties.name}`,
          html: `<p>${booking.guest_name} (${booking.guest_email}) booked ${booking.properties.name}.</p>
                 <p>${booking.checkin} → ${booking.checkout} · $${booking.amount_total}</p>`,
        });
      }
    }
  }

  res.json({ received: true });
});

export default router;
