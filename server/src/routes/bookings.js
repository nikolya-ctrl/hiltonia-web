import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { stripe } from '../lib/stripe.js';

const router = Router();

function nightsBetween(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

router.post('/checkout', async (req, res) => {
  try {
    const { propertyId, checkin, checkout, guestName, guestEmail } = req.body;

    if (!propertyId || !checkin || !checkout || !guestName || !guestEmail) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const nights = nightsBetween(checkin, checkout);
    if (!Number.isFinite(nights) || nights < 1) {
      return res.status(400).json({ error: 'Check-out must be after check-in.' });
    }

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('active', true)
      .single();

    if (propError || !property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    // Reject overlapping stays for the same property. Any pending booking
    // ties up the dates until its Stripe session expires (24h) or is cancelled.
    const { data: overlapping, error: overlapError } = await supabase
      .from('bookings')
      .select('id')
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed'])
      .lt('checkin', checkout)
      .gt('checkout', checkin);

    if (overlapError) throw overlapError;

    if (overlapping.length > 0) {
      return res.status(409).json({ error: 'Property is not available for those dates.' });
    }

    const amountTotal = Number((nights * Number(property.price_per_night)).toFixed(2));

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        property_id: propertyId,
        guest_name: guestName,
        guest_email: guestEmail,
        checkin,
        checkout,
        nights,
        amount_total: amountTotal,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: guestEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountTotal * 100),
            product_data: {
              name: `${property.name} — ${nights} night${nights > 1 ? 's' : ''}`,
              description: `${checkin} to ${checkout}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { bookingId: booking.id },
      success_url: `${process.env.FRONTEND_URL}/?booking=success`,
      cancel_url: `${process.env.FRONTEND_URL}/?booking=cancelled`,
    });

    await supabase
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', booking.id);

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the booking.' });
  }
});

export default router;
