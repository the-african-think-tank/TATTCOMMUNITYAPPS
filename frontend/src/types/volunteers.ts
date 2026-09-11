/** Volunteer role from GET /volunteers/roles */
export interface VolunteerRole {
  id: string;
  name: string;
  location: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];

  weeklyHours: number;
  durationMonths: number;
  openUntil: string;
  isActive: boolean;
  chapter?: { id: string; name?: string; code?: string };
}

/** Location type derived from role.location for display badges */
export type RoleLocationType = "REMOTE" | "HYBRID" | "IN_PERSON" | "TECHNICAL";

/** Apply form payload for POST /volunteers/apply */
export interface ApplyVolunteerPayload {
  roleId?: string | undefined;
  interestsAndSkills: string[];
  weeklyAvailability: Record<string, string[]>;
  hoursAvailablePerWeek: number;
  reasonForApplying: string;
  questionsForAdmin?: string | undefined;
  phoneNumber?: string | undefined;
  birthDate?: string | undefined;
}
