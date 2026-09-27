import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { __resetMemoryForTests, getState, markNotified, resetDemo, resolveChange } from "./store";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "headsup-store-"));

afterEach(async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  __resetMemoryForTests();
});

describe("state store", () => {
  it("reloads resolved status from disk after memory is cleared", async () => {
    const file = path.join(dir, "state.json");
    process.env.HEADSUP_STATE_PATH = file;
    __resetMemoryForTests();
    await resetDemo();
    await markNotified("change-1", "sms");
    await resolveChange("change-1", "prior_auth_started");
    __resetMemoryForTests();
    const restored = await getState();
    expect(restored.statuses["change-1"]?.status).toBe("resolved");
    expect(restored.statuses["change-1"]?.action).toBe("prior_auth_started");
    expect(restored.lastNotifiedChangeId).toBe("change-1");
    expect(fs.existsSync(file)).toBe(true);
  });
});
