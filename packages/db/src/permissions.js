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
  EVENTS_WRITE: 'events:write',
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
  [PERMISSIONS.EVENTS_WRITE]: 'Add, edit and remove calendar events',
  [PERMISSIONS.MEMBERS_WRITE]: 'Manage members and roles',
}

export const ALL_PERMISSIONS = Object.values(PERMISSIONS)

/**
 * The President is the one fixed point in an otherwise editable scheme.
 *
 * Exactly one account holds this role — the association's own address — and
 * nobody can be moved into it, out of it, or change what it grants. Every
 * other role is data the President edits. Migration 0007 enforces the same
 * in triggers, so this is a description of the database, not a second rule.
 */
export const PRESIDENT_ROLE_ID = 'role-president'

/**
 * Permissions the President never hands out. Managing members and roles is
 * what makes someone the President; a role that carried it could rewrite
 * itself, and the "only constant" would stop being one.
 */
export const PRESIDENT_ONLY = [PERMISSIONS.MEMBERS_WRITE]

export const GRANTABLE_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !PRESIDENT_ONLY.includes(p))

/**
 * Permissions grouped by the feature they unlock, in the order the role
 * editor shows them. A role's "authority" over a feature is which of these
 * boxes are ticked.
 */
export const PERMISSION_GROUPS = [
  {
    feature: 'Blog',
    permissions: [PERMISSIONS.POSTS_READ, PERMISSIONS.POSTS_WRITE, PERMISSIONS.POSTS_PUBLISH],
  },
  { feature: 'Syllabus archive', permissions: [PERMISSIONS.SYLLABI_WRITE] },
  { feature: 'Forms', permissions: [PERMISSIONS.FORMS_WRITE, PERMISSIONS.SUBMISSIONS_READ] },
  { feature: 'Calendar', permissions: [PERMISSIONS.EVENTS_WRITE] },
  { feature: 'Newsletter', permissions: [PERMISSIONS.SUBSCRIBERS_READ] },
]

/**
 * Does this role grant every one of `required`?
 * A missing role grants nothing — never default to allow.
 */
export function can(role, ...required) {
  if (!role || !Array.isArray(role.permissions)) return false
  return required.every((p) => role.permissions.includes(p))
}
