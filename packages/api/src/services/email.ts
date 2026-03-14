export async function sendInviteEmail(email: string, role: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Yash CRM <noreply@yashcrm.com>",
      to: email,
      subject: "You've been invited to Yash CRM",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Welcome to Yash CRM</h2>
          <p>You've been invited as a <strong>${role.replace("_", " ")}</strong>.</p>
          <p>Click the link below to sign in with your Google account:</p>
          <a href="${appUrl}/login"
             style="display: inline-block; padding: 12px 24px; background: #1a1a2e; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Sign in to Yash CRM
          </a>
          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    }),
  });
}
