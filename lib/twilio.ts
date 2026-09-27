import type { SmsResult } from "./types";

const ENV_KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "DOCTOR_PHONE",
  "APP_URL",
] as const;

export function maskPhone(phone: string | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return digits.slice(-4);
}

export function twilioEnvReady(): boolean {
  return ENV_KEYS.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function preview(body: string): SmsResult {
  return {
    sent: false,
    mode: "preview",
    body,
    toMasked: maskPhone(process.env.DOCTOR_PHONE),
  };
}

export async function sendSms(body: string): Promise<SmsResult> {
  const toMasked = maskPhone(process.env.DOCTOR_PHONE);
  if (!twilioEnvReady()) return preview(body);

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_FROM_NUMBER!.trim();
  const to = process.env.DOCTOR_PHONE!.trim();

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      },
    );

    if (!response.ok) {
      const raw = await response.text();
      let error = `Twilio request failed (${response.status})`;
      try {
        const parsed = JSON.parse(raw) as { message?: string };
        if (parsed.message) error = parsed.message;
      } catch {
        if (raw.trim()) error = raw.trim().slice(0, 240);
      }
      return { sent: false, body, toMasked, error };
    }

    return { sent: true, mode: "twilio", body, toMasked };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twilio request failed";
    return { sent: false, body, toMasked, error: message };
  }
}
