/**
 * Permissions are plain strings stored per-role, not a role enum on the user.
 *
 * The reason is turnover: every October a new board invents a committee that
 * needs "posts but not syllabi", and that has to be a data change made from
 * the admin panel, never a migration plus a deploy. A role is a bag of these
 * strings; a user has one role.
 *
 * When this moves to Postgres these become rows in `role_permissions`, and
 * every RLS policy is a lookup against them. Keep the strings stable — they
 * will end up as literals inside SQL policies.
 */
export const PERMISSIONS = {
  POSTS_READ: 'posts:read',
  POSTS_WRITE: 'posts:write',
  POSTS_PUBLISH: 'posts:publish',
  SYLLABI_WRITE: 'syllabi:write',
  SUBSCRIBERS_READ: 'subscribers:read',
  FORMS_WRITE: 'forms:write',
  SUBMISSIONS_READ: 'submissions:read',
  MEMBERS_WRITE: 'members:write',
}

/** Human labels for the role editor in the admin panel. */
export const PERMISSION_LABELS = {
  [PERMISSIONS.POSTS_READ]: 'View posts',
  [PERMISSIONS.POSTS_WRITE]: 'Write and edit posts',
  [PERMISSIONS.POSTS_PUBLISH]: 'Publish posts to the live site',
  [PERMISSIONS.SYLLABI_WRITE]: 'Upload and remove syllabi',
  [PERMISSIONS.SUBSCRIBERS_READ]: 'View newsletter subscribers',
  [PERMISSIONS.FORMS_WRITE]: 'Create and edit forms',
  [PERMISSIONS.SUBMISSIONS_READ]: 'Read form submissions',
  [PERMISSIONS.MEMBERS_WRITE]: 'Manage members and roles',
}

export const ALL_PERMISSIONS = Object.values(PERMISSIONS)

/**
 * Does this role grant every one of `required`?
 * A missing role grants nothing — never default to allow.
 */
export function can(role, ...required) {
  if (!role || !Array.isArray(role.permissions)) return false
  return required.every((p) => role.permissions.includes(p))
}
