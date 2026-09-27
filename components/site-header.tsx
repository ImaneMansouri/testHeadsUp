"use client";

import { BellRing, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { InlineError } from "@/components/inline-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HeaderDoctor = {
  name: string;
  specialty: string;
  practice: string;
};

const LINKS = [
  { href: "/", label: "Command Center" },
  { href: "/changes", label: "Changes" },
  { href: "/how-it-works", label: "How it works" },
];

function initials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SiteHeader({ doctor }: { doctor: HeaderDoctor }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function resetDemo() {
    setResetting(true);
    setResetError(null);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "We couldn't reset the demo.");
      router.push(`/?r=${Date.now()}`);
      router.refresh();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "We couldn't reset the demo.");
      setResetting(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A1020]/90 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <BellRing className="h-5 w-5 text-[#22D3EE]" />
          Heads Up
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "text-white" : "text-white/60 hover:text-white"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left hover:bg-white/10"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#3B6BFF] text-xs font-extrabold">
                  {initials(doctor.name)}
                </span>
                <span className="hidden text-sm font-semibold sm:inline">{doctor.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{doctor.name}</DropdownMenuLabel>
              <p className="px-3 text-xs text-[#5C6B8A]">{doctor.specialty}</p>
              <p className="px-3 pb-2 text-xs text-[#5C6B8A]">{doctor.practice}</p>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={resetting}
                onSelect={(event) => {
                  event.preventDefault();
                  void resetDemo();
                }}
              >
                {resetting ? "Resetting…" : "Reset demo"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="space-y-1 border-t border-white/10 px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-semibold hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {resetError ? (
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <InlineError message={resetError} onRetry={() => void resetDemo()} tone="dark" />
        </div>
      ) : null}
    </header>
  );
}
