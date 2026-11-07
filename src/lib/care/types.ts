export type MedForm = "tablet" | "capsule" | "liquid" | "injection";
export type MedColor = "sand" | "sky" | "blush" | "stone" | "mint";
export type Repeat = "daily" | "weekly" | "custom";
export type Food = "with" | "empty" | "either";
export type AlertSound = "chime" | "bell" | "soft" | "none";
export type DoseStatus = "due" | "taken" | "skipped" | "snoozed";
export type ReminderStyle = "gentle" | "standard" | "persistent";
export type SetupPhase = "slides" | "signin" | "name" | "age" | "language" | "why" | "done";

export type Medicine = {
  id: string;
  name: string;
  form: MedForm;
  amount: number;
  color: MedColor;
  condition: string;
  sideEffects: string;
  repeat: Repeat;
  times: string[];
  weekdays: number[];
  intervalDays: number;
  food: Food;
  startDate: string;
  endDate: string | null;
  alertSound: AlertSound;
  extraLoud: boolean;
  trackSupply: boolean;
  stock: number;
  packSize: number;
  refillAt: number;
  paused: boolean;
};

export type DoseLog = {
  medicineId: string;
  date: string;
  time: string;
  status: "taken" | "skipped" | "snoozed";
  snoozeUntil?: string;
};

export type Permissions = {
  seeDoses: boolean;
  markDoses: boolean;
  editMedicines: boolean;
  seeHistory: boolean;
};

export type CarePerson = {
  id: string;
  name: string;
  pending: boolean;
  permissions: Permissions;
  medicines: Medicine[];
};

export type Prescription = {
  id: string;
  name: string;
  createdAt: string;
  kind: "image" | "pdf";
  dataUrl: string;
};

export type Profile = {
  onboarded: boolean;
  phase: SetupPhase;
  slide: number;
  name: string;
  age: number | null;
  reasons: string[];
  signedIn: boolean;
  careSeeded: boolean;
  inviteCode: string | null;
  fullScreenReminders: boolean;
  reminderStyle: ReminderStyle;
  medicines: Medicine[];
  logs: DoseLog[];
  people: CarePerson[];
  personLogs: Record<string, DoseLog[]>;
  prescriptions: Prescription[];
};

export type ScheduledDose = {
  medicine: Medicine;
  date: string;
  time: string;
  status: DoseStatus;
};
