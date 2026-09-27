"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

export type PhonePhase = "lock" | "typing" | "message";

export function PhoneMock({
  phase,
  body,
  sent,
  mode,
  toMasked,
  soundOn,
  onToggleSound,
}: {
  phase: PhonePhase;
  body: string | null;
  sent: boolean;
  mode?: "preview" | "twilio";
  toMasked?: string;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  const now = useClock();
  const time = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "--:--";
  const date = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative">
        <span className="absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-[#2A2A2E]" />
        <span className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-[#2A2A2E]" />
        <span className="absolute -right-[3px] top-40 h-20 w-[3px] rounded-r bg-[#2A2A2E]" />
        <div className="rounded-[42px] bg-[#141416] p-[10px] shadow-[0_30px_80px_rgba(10,16,32,0.35),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="relative h-[590px] overflow-hidden rounded-[32px] bg-[#070B14]">
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
            <div className="relative z-10 flex items-center justify-between px-5 pt-3 text-[12px] font-semibold text-white">
              <span className="w-14">{time}</span>
              <span className="w-14" />
              <span className="flex w-14 items-center justify-end gap-1">
                <Signal />
                <Battery />
              </span>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.18),transparent_42%),linear-gradient(180deg,#10182c_0%,#070B14_70%)]" />
            {phase === "lock" ? (
              <div className="relative z-10 px-6 pt-16 text-center text-white">
                <p className="text-[56px] font-extrabold leading-none tracking-tight">{time}</p>
                <p className="mt-2 text-sm text-white/70">{date}</p>
                <div className="mx-auto mt-16 max-w-[230px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Messages</p>
                  <p className="mt-1 text-sm text-white/80">No coverage alerts yet.</p>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex h-[520px] flex-col px-3 pt-8">
                <div className="mb-4 text-center">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#3B6BFF] text-xs font-extrabold text-white">
                    HU
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">Heads Up</p>
                  <p className="text-[11px] text-white/50">SMS</p>
                </div>
                <div className="mt-auto pb-6">
                  {phase === "typing" ? (
                    <div className="flex w-fit items-center gap-1 rounded-full bg-[#E9E9EB] px-3 py-2.5">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-black/50" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-black/50 [animation-delay:150ms]" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-black/50 [animation-delay:300ms]" />
                    </div>
                  ) : body ? (
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className="max-w-[94%] rounded-[18px] rounded-tl-md bg-[#E9E9EB] px-3 py-2.5 text-left text-[13px] leading-snug text-black shadow-sm"
                    >
                      <Linkified text={body} />
                    </motion.div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-center">
        {phase === "message" && sent ? (
          <p className="text-sm font-semibold text-[#047857]">
            ✓ Delivered to •••• {toMasked || "····"}
          </p>
        ) : null}
        {phase === "message" && mode === "preview" ? (
          <p className="text-sm font-semibold text-[#5C6B8A]">Preview mode: Twilio not configured</p>
        ) : null}
        <button
          type="button"
          onClick={onToggleSound}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C6B8A]"
          aria-pressed={soundOn}
        >
          {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {soundOn ? "Sound on" : "Sound off"}
        </button>
      </div>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        part.startsWith("http") ? (
          <a key={index} href={part} className="font-semibold text-[#3B6BFF] underline" target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function Signal() {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      <span className="h-1 w-[3px] rounded-sm bg-white" />
      <span className="h-1.5 w-[3px] rounded-sm bg-white" />
      <span className="h-2 w-[3px] rounded-sm bg-white" />
      <span className="h-3 w-[3px] rounded-sm bg-white" />
    </span>
  );
}

function Battery() {
  return (
    <span className="relative h-2.5 w-5 rounded-[3px] border border-white" aria-hidden>
      <span className="absolute inset-y-[1px] left-[1px] w-[12px] rounded-[1px] bg-white" />
      <span className="absolute -right-[3px] top-[2px] h-1 w-[2px] rounded-r bg-white" />
    </span>
  );
}

export function playNotifyTone() {
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const ctx = new AudioContextCtor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.44);
  osc.onended = () => void ctx.close();
}
