import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSms } from "./twilio";

const KEYS = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "DOCTOR_PHONE",
  "APP_URL",
] as const;

const ORIGINAL = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

describe("sendSms", () => {
  it("returns preview mode when any env var is missing", async () => {
    for (const key of KEYS) delete process.env[key];
    const result = await sendSms("Heads Up: hello");
    expect(result.sent).toBe(false);
    expect(result.mode).toBe("preview");
    expect(result.body).toBe("Heads Up: hello");
    expect(result.toMasked).toBe("••••");
    expect(result.error).toBeUndefined();
  });

  it("returns an error payload instead of throwing when Twilio fails", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+15550001111";
    process.env.DOCTOR_PHONE = "+15551231234";
    process.env.APP_URL = "http://localhost:3000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: "The number is unverified" }),
      })),
    );
    const result = await sendSms("hello");
    expect(result.sent).toBe(false);
    expect(result.error).toBe("The number is unverified");
    expect(result.toMasked).toBe("1234");
    expect(result.body).toBe("hello");
  });
});
