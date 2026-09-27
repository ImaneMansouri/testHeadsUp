import type { Metadata } from "next";
import { ChangeDetail } from "@/components/change-detail";

export const metadata: Metadata = { title: "Change" };

export default async function ChangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChangeDetail id={id} />;
}
