import type { Metadata } from "next";
import { ImpactDashboard } from "@/components/impact-dashboard";

export const metadata: Metadata = { title: "Impact" };

export default function ImpactPage() {
  return <ImpactDashboard />;
}
