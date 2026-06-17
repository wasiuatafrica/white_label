type EmailAddress = string | { email: string; name?: string };

type SendEmailArgs = {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

function parseEmailAddress(value: string): EmailAddress {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: value.trim() };

  const [, name, email] = match;
  return {
    email: email.trim(),
    ...(name.trim() ? { name: name.trim().replace(/^"|"$/g, '') } : {}),
  };
}

async function readErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `SendGrid request failed with status ${response.status}`;

  try {
    const data = JSON.parse(text) as { errors?: Array<{ message?: string }>; message?: string };
    return data.errors?.[0]?.message || data.message || text;
  } catch {
    return text;
  }
}

export async function sendEmail({ to, from, subject, html, text, replyTo }: SendEmailArgs) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is required to send email');
  }

  const sender = from || process.env.SENDGRID_FROM_EMAIL || 'FT9ja <accounts@ft9ja.com>';
  const replyToEmail = replyTo || process.env.SENDGRID_REPLY_TO_EMAIL;
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const content = [
    ...(text ? [{ type: 'text/plain', value: text }] : []),
    ...(html ? [{ type: 'text/html', value: html }] : []),
  ];

  if (recipients.length === 0) {
    throw new Error('At least one recipient is required to send email');
  }

  if (content.length === 0) {
    throw new Error('Email requires html or text content');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients, subject }],
      from: parseEmailAddress(sender),
      ...(replyToEmail ? { reply_to: parseEmailAddress(replyToEmail) } : {}),
      content,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return { id: response.headers.get('x-message-id') };
}
