export {
  changePasswordAction,
  signInWithPassword,
  signOut,
  type AuthActionResult,
} from "@/lib/auth/actions";
export {
  evaluateAppAccess,
  evaluatePasswordChangeAccess,
  postSignInPath,
  roleHomePath,
} from "@/lib/auth/access";
export {
  APP_ROLES,
  PROVISIONABLE_ROLES,
  ROLE_PERMISSIONS,
  hasRequiredRole,
  isAppRole,
  isProvisionableRole,
  type AppRole,
  type ProvisionableRole,
} from "@/lib/auth/roles";
export {
  getAuthClaims,
  getCurrentProfile,
  getCurrentProfileFresh,
  requireAdmin,
  requireAuth,
  requireAuthForPasswordChange,
  requireRole,
  requireStaffOrAdmin,
} from "@/lib/auth/session";
