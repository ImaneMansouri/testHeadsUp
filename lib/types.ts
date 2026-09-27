export type CoverageRow = {
  planId: string;
  planName: string;
  insurer: string;
  formularyId: string;
  rxcui: string;
  drugName: string;
  covered: boolean | null;
  tier: number | null;
  priorAuthorization: boolean | null;
  stepTherapy: boolean | null;
  quantityLimit: boolean | null;
  estMonthlyCost: number | null;
};

export type Snapshot = {
  id: string;
  label: string;
  sourceFile: string;
  capturedAt: string;
  rows: CoverageRow[];
};

export type ChangeType =
  | "removed"
  | "tier_increase"
  | "tier_decrease"
  | "prior_authorization_added"
  | "prior_authorization_removed"
  | "step_therapy_added"
  | "step_therapy_removed"
  | "quantity_limit_added"
  | "quantity_limit_removed";

export type Direction = "worsened" | "improved";

export type Change = {
  id: string;
  planId: string;
  planName: string;
  insurer: string;
  rxcui: string;
  drugName: string;
  changeType: ChangeType;
  direction: Direction;
  before: CoverageRow;
  after: CoverageRow | null;
  evidence: { beforeFile: string; afterFile: string };
};

export type Patient = {
  id: string;
  name: string;
  planId: string;
  rxcuis: string[];
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  practice: string;
  patients: Patient[];
};

export type Fact = {
  value: string;
  label: string;
  source: string;
  url: string;
};

export type ResolveAction = "reviewed" | "switched" | "prior_auth_started";

export type ChangeStatus = "open" | "resolved";

export type StoredStatus = {
  status: ChangeStatus;
  action: ResolveAction | null;
  resolvedAt: string | null;
  notifiedAt: string | null;
  smsBody: string | null;
  smsMode: "preview" | "twilio" | null;
};

export type WatchStep = {
  label: string;
  ms: number;
};

export type StoredRun = {
  id: string;
  startedAt: string;
  steps: WatchStep[];
  changeCount: number;
  patientCount: number;
};

export type StoredWatch = {
  id: string;
  planId: string;
  rxcui: string;
  createdAt: string;
};

export type AppState = {
  version: 1;
  updatedAt: string;
  statuses: Record<string, StoredStatus>;
  runs: StoredRun[];
  watches: StoredWatch[];
  lastNotifiedChangeId: string | null;
};

export type SmsResult = {
  sent: boolean;
  mode?: "preview" | "twilio";
  body: string;
  toMasked: string;
  error?: string;
};
