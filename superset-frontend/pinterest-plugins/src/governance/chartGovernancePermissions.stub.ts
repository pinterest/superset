import type {
  UndefinedUser,
  UserWithPermissionsAndRoles,
} from 'src/types/bootstrapTypes';

/**
 * Stubbed permission gate for OSS/submodule builds.
 * Internal builds replace this with Pinterest role-aware logic.
 */
export function canVerifyChart(
  _user?: UserWithPermissionsAndRoles | UndefinedUser | null,
): boolean {
  return false;
}
