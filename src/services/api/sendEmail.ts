export async function sendEmail(endpoint: string, data: Record<string, unknown>) {
  // Email sending was removed from the stack (Brevo/SendGrid).
  // Stubbed to keep the account-deletion flow from throwing.
  console.log("sendEmail stub", endpoint, data);
  return Promise.resolve({ ok: true });
}
