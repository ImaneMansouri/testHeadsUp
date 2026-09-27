import type { Metadata } from "next";
import { MobileChange } from "@/components/mobile-change";

export const metadata: Metadata = { title: "Alert" };

export default async function MobilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MobileChange id={id} />;
}
