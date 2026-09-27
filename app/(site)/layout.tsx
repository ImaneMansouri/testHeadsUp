import { SiteHeader } from "@/components/site-header";
import { getDoctor } from "@/lib/data";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const doctor = getDoctor();
  return (
    <div className="min-h-screen">
      <SiteHeader
        doctor={{ name: doctor.name, specialty: doctor.specialty, practice: doctor.practice }}
      />
      {children}
      <footer className="border-t border-[#E6EAF2] px-5 py-8 text-sm text-[#5C6B8A]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Coverage decisions are rule-based. Texts never include patient names.</p>
          <p>Synthetic demo patients · CMS Part D files</p>
        </div>
      </footer>
    </div>
  );
}
