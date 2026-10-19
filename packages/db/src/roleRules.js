import { DataError, CODES } from './errors.js'
import { ALL_PERMISSIONS, PRESIDENT_ONLY, PRESIDENT_ROLE_ID } from './permissions.js'

/**
 * Rules for a role definition, shared by both adapters.
 *
 * The President-only permissions are also refused by the roles_president_guard
 * trigger (0007), but there the refusal arrives as a bare 42501. Checking here
 * first gives the panel a sentence instead.
 */
export function checkRole(patch) {
  if (patch.name !== undefined && !String(patch.name).trim()) {
    throw new DataError(CODES.INVALID, 'Give the role a name.')
  }
  if (patch.permissions !== undefined) {
    if (!Array.isArray(patch.permissions)) {
      throw new DataError(CODES.INVALID, 'Permissions must be a list.')
    }
    const unknown = patch.permissions.filter((p) => !ALL_PERMISSIONS.includes(p))
    if (unknown.length) {
      throw new DataError(CODES.INVALID, `Unknown permission: ${unknown.join(', ')}.`)
    }
    if (patch.permissions.some((p) => PRESIDENT_ONLY.includes(p))) {
      throw new DataError(
        CODES.FORBIDDEN,
        'Managing members and roles stays with the President. It cannot be given to another role.',
      )
    }
  }
}

/** The President first — it is the fixed point — then everyone else by name. */
export function compareRoles(a, b) {
  return (
    Number(b.id === PRESIDENT_ROLE_ID) - Number(a.id === PRESIDENT_ROLE_ID) ||
    a.name.localeCompare(b.name)
  )
}
