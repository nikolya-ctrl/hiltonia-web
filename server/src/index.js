import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bookingsRouter from './routes/bookings.js';
import webhookRouter from './routes/webhook.js';
import contactRouter from './routes/contact.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Stripe webhook needs the raw request body for signature verification,
// so it's mounted before the global express.json() body parser.
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/bookings', bookingsRouter);
app.use('/api/contact', contactRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Hiltonia API listening on :${port}`));
