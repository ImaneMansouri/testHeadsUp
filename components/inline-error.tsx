import { RotateCcw } from "lucide-react";

export function InlineError({
  message,
  onRetry,
  tone = "light",
}: {
  message: string;
  onRetry?: () => void;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      role="alert"
      className={
        dark
          ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F43F5E]/40 bg-[#F43F5E]/10 px-4 py-3 text-sm text-white"
          : "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F43F5E]/30 bg-white px-4 py-3 text-sm text-[#9F1239] shadow-sm"
      }
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={
            dark
              ? "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0A1020]"
              : "inline-flex items-center gap-1.5 rounded-full bg-[#0A1020] px-3 py-1.5 text-xs font-semibold text-white"
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
