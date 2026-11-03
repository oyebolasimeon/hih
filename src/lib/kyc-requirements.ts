import type { ProfileType } from "@/models/Profile";
import type { KycCheckType } from "@/models/KycSubmission";

export type KycRequirement = {
  type: KycCheckType;
  label: string;
  /** hih = in-house AI + admin fallback; manual = always Ops */
  provider: "hih" | "manual";
  required: boolean;
};

/** NIN/ID + selfie + name for all; CAC details for estate managers; student ID manual */
export function requirementsForProfile(type: ProfileType): KycRequirement[] {
  const base: KycRequirement[] = [
    {
      type: "nin_face",
      label: "Legal name + NIN ID photo + selfie",
      provider: "hih",
      required: true,
    },
  ];

  if (type === "estate_manager") {
    base.push({
      type: "cac",
      label: "CAC / RC details (admin review)",
      provider: "manual",
      required: true,
    });
  }

  if (type === "student") {
    base.push({
      type: "student_id",
      label: "Student ID upload (admin review)",
      provider: "manual",
      required: true,
    });
  }

  return base;
}
