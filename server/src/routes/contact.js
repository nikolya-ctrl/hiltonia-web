import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { sendEmail } from '../lib/email.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, propertyId, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const { error } = await supabase.from('enquiries').insert({
      name,
      email,
      property_id: propertyId || null,
      message,
    });

    if (error) throw error;

    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL,
      subject: `New enquiry from ${name}`,
      html: `<p><strong>${name}</strong> (${email})</p><p>${message}</p>`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong sending your message.' });
  }
});

export default router;
