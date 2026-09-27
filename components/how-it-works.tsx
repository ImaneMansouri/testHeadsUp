import { Database, GitCompare, MessageSquare, ScanSearch, Stethoscope, Users } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "CMS / insurer data",
    body: "Public formulary files land on a schedule. Heads Up starts from those rows, not from a model.",
  },
  {
    icon: ScanSearch,
    title: "Snapshot",
    body: "Each release is frozen: plan, drug, tier, prior authorization, step therapy, quantity limit, and an estimated cost when CMS priced it.",
  },
  {
    icon: GitCompare,
    title: "Compare",
    body: "Code matches rows on plan and RxCUI. A missing covered drug, a higher tier, or a new restriction becomes a change. Nulls are not changes.",
  },
  {
    icon: Users,
    title: "Match doctors",
    body: "Worsened changes are matched to the doctor’s panel by plan and drug. The text receives a count, never a name.",
  },
  {
    icon: MessageSquare,
    title: "SMS",
    body: "The doctor gets a short message and a link. Replying 1 marks that alert reviewed.",
  },
  {
    icon: Stethoscope,
    title: "Action",
    body: "On the phone or the chart, the doctor starts prior auth, switches the medication, or marks it reviewed.",
  },
];

export function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B6BFF]">How it works</p>
      <h1 className="mt-3 max-w-3xl text-[42px] font-extrabold leading-[1.02] tracking-tight md:text-[56px]">
        From a CMS file to a text the doctor can act on.
      </h1>
      <ol className="mt-12 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="grid gap-4 rounded-2xl border border-[#E6EAF2] bg-white p-5 shadow-[0_10px_40px_rgba(15,26,51,0.04)] sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0A1020] text-white">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#5C6B8A] sm:hidden">
                0{index + 1}
              </span>
            </div>
            <div className="sm:flex sm:items-start sm:gap-4">
              <span className="hidden pt-1 text-xs font-extrabold uppercase tracking-wider text-[#5C6B8A] sm:block">
                0{index + 1}
              </span>
              <div>
                <h2 className="text-xl font-extrabold">{step.title}</h2>
                <p className="mt-1 text-sm leading-6 text-[#5C6B8A]">{step.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-2xl border border-[#3B6BFF]/40 bg-[#111A2E] p-8 text-white shadow-[0_0_40px_rgba(59,107,255,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22D3EE]">Partner path</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Integrates with Impiricus</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">
          Heads Up can act as a new real-world trigger, routing doctors to copay programs, bridge programs and
          reimbursement specialists.
        </p>
      </section>
    </div>
  );
}
