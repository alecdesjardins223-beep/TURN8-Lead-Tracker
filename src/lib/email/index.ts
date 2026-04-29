import { Resend } from "resend";

export interface SendEmailParams {
  to:      string;
  subject: string;
  text:    string;
}

export interface SendEmailResult {
  ok:     boolean;
  id?:    string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM ?? "TURN8 <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[email:mock] to:", params.to, "| subject:", params.subject);
    return { ok: true, id: `mock_${Date.now()}` };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to:      [params.to],
      subject: params.subject,
      text:    params.text,
    });

    if (error) {
      console.error("[email:resend] error:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email:resend] exception:", msg);
    return { ok: false, error: msg };
  }
}
