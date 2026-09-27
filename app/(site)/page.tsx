import { CommandCenter } from "@/components/command-center";
import { getDoctor, getFacts } from "@/lib/data";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const params = await searchParams;
  const doctor = getDoctor();
  return <CommandCenter key={params.r ?? "initial"} facts={getFacts()} doctorName={doctor.name} />;
}
