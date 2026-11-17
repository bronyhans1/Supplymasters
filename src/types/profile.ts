import type { AppRole } from "@/lib/auth/roles";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
