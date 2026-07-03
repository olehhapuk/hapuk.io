import { Resend } from 'resend';
import { env } from '@/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Single transactional-email entry point. Used by Better Auth for verification,
 * password reset, and organization invitations.
 *
 * In dev without RESEND_API_KEY set, emails are logged to the console instead of sent.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  if (!resend) {
    console.info(
      `\n[email:dev] To: ${to}\nSubject: ${subject}\n${text ?? html}\n`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  // Surface delivery failures (e.g. unverified sending domain) instead of failing silently.
  if (error) {
    console.error(`[email] Resend failed for "${subject}" → ${to}:`, error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}
