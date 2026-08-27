import type { ProfileType } from "@/models/Profile";
import type { KycCheckType } from "@/models/KycSubmission";

export type KycRequirement = {
  type: KycCheckType;
  label: string;
  provider: "prembly" | "manual";
  required: boolean;
};

/** NIN+face all; CAC estate managers; student ID manual */
export function requirementsForProfile(type: ProfileType): KycRequirement[] {
  const base: KycRequirement[] = [
    {
      type: "nin_face",
      label: "NIN + selfie",
      provider: "prembly",
      required: true,
    },
  ];

  if (type === "estate_manager") {
    base.push({
      type: "cac",
      label: "CAC / RC number",
      provider: "prembly",
      required: true,
    });
  }

  if (type === "student") {
    base.push({
      type: "student_id",
      label: "Student ID upload (manual review)",
      provider: "manual",
      required: true,
    });
  }

  return base;
}
