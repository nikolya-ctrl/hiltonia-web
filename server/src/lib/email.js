const { RESEND_API_KEY, FROM_EMAIL } = process.env;

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.warn(`Email not sent (RESEND_API_KEY/FROM_EMAIL not configured): "${subject}" to ${to}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend email failed:', res.status, text);
  }
}
