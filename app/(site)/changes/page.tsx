import type { Metadata } from "next";
import { ChangesBrowser } from "@/components/changes-browser";

export const metadata: Metadata = { title: "Changes" };

export default function ChangesPage() {
  return <ChangesBrowser />;
}
