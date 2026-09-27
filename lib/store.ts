import fs from "node:fs";
import path from "node:path";
import { clearExplanationCache } from "./explain";
import type { AppState, ResolveAction, StoredRun, StoredStatus, StoredWatch } from "./types";

const MEMORY = Symbol.for("headsup.state.v1");

type Slot = { state: AppState };

function freshState(): AppState {
  return {
    version: 1,
    updatedAt: "1970-01-01T00:00:00.000Z",
    statuses: {},
    runs: [],
    watches: [],
    lastNotifiedChangeId: null,
  };
}

function slot(): Slot {
  const g = globalThis as typeof globalThis & { [MEMORY]?: Slot };
  if (!g[MEMORY]) g[MEMORY] = { state: freshState() };
  return g[MEMORY];
}

export function __resetMemoryForTests(): void {
  slot().state = freshState();
  clearExplanationCache();
}

function stateFilePath(): string {
  if (process.env.HEADSUP_STATE_PATH?.trim()) return process.env.HEADSUP_STATE_PATH.trim();
  return path.join(process.cwd(), "data", "state.json");
}

function tmpFilePath(): string {
  return path.join("/tmp", "headsup-state.json");
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function readFileState(file: string): AppState | null {
  try {
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as AppState;
    if (!parsed || parsed.version !== 1 || typeof parsed.updatedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFileState(file: string, state: AppState): boolean {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

async function readRedis(): Promise<AppState | null> {
  const cfg = redisConfig();
  if (!cfg) return null;
  try {
    const response = await fetch(`${cfg.url}/get/headsup:state`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: string | null };
    if (!payload.result) return null;
    const parsed = JSON.parse(payload.result) as AppState;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeRedis(state: AppState): Promise<void> {
  const cfg = redisConfig();
  if (!cfg) return;
  try {
    await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", "headsup:state", JSON.stringify(state)]),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Shared store is optional. Memory and disk still hold this instance's copy.
  }
}

function newest(candidates: Array<AppState | null>): AppState {
  const present = candidates.filter((item): item is AppState => item !== null);
  present.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return present[0] ? structuredClone(present[0]) : freshState();
}

async function loadNewest(): Promise<AppState> {
  const redis = await readRedis();
  const state = newest([
    slot().state,
    readFileState(stateFilePath()),
    readFileState(tmpFilePath()),
    redis,
  ]);
  slot().state = state;
  return structuredClone(state);
}

async function persist(state: AppState): Promise<void> {
  slot().state = structuredClone(state);
  writeFileState(stateFilePath(), state);
  if (stateFilePath() !== tmpFilePath()) writeFileState(tmpFilePath(), state);
  await writeRedis(state);
}

let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function touch(state: AppState): void {
  state.updatedAt = new Date().toISOString();
}

export async function getState(): Promise<AppState> {
  return serialize(loadNewest);
}

export async function recordRun(run: StoredRun): Promise<void> {
  await serialize(async () => {
    const state = await loadNewest();
    state.runs = [run, ...state.runs].slice(0, 20);
    touch(state);
    await persist(state);
  });
}

export async function markNotified(changeId: string, smsBody: string): Promise<void> {
  await serialize(async () => {
    const state = await loadNewest();
    const current = state.statuses[changeId];
    const next: StoredStatus = {
      status: current?.status ?? "open",
      action: current?.action ?? null,
      resolvedAt: current?.resolvedAt ?? null,
      notifiedAt: new Date().toISOString(),
      smsBody,
    };
    state.statuses[changeId] = next;
    state.lastNotifiedChangeId = changeId;
    touch(state);
    await persist(state);
  });
}

export async function resolveChange(changeId: string, action: ResolveAction): Promise<void> {
  await serialize(async () => {
    const state = await loadNewest();
    const current = state.statuses[changeId];
    if (current?.status === "resolved") return;
    state.statuses[changeId] = {
      status: "resolved",
      action,
      resolvedAt: new Date().toISOString(),
      notifiedAt: current?.notifiedAt ?? null,
      smsBody: current?.smsBody ?? null,
    };
    touch(state);
    await persist(state);
  });
}

export async function applyInboundReview(): Promise<{ ok: boolean; changeId: string | null }> {
  return serialize(async () => {
    const state = await loadNewest();
    const changeId = state.lastNotifiedChangeId;
    if (!changeId) return { ok: false, changeId: null };
    const current = state.statuses[changeId];
    if (current?.status !== "resolved") {
      state.statuses[changeId] = {
        status: "resolved",
        action: "reviewed",
        resolvedAt: new Date().toISOString(),
        notifiedAt: current?.notifiedAt ?? null,
        smsBody: current?.smsBody ?? null,
      };
      touch(state);
      await persist(state);
    }
    return { ok: true, changeId };
  });
}

export async function addWatch(planId: string, rxcui: string): Promise<StoredWatch> {
  return serialize(async () => {
    const state = await loadNewest();
    const id = `${planId}:${rxcui}`;
    const existing = state.watches.find((watch) => watch.id === id);
    if (existing) return existing;
    const watch: StoredWatch = { id, planId, rxcui, createdAt: new Date().toISOString() };
    state.watches = [watch, ...state.watches];
    touch(state);
    await persist(state);
    return watch;
  });
}

export async function resetDemo(): Promise<void> {
  await serialize(async () => {
    const state = freshState();
    touch(state);
    clearExplanationCache();
    await persist(state);
  });
}
