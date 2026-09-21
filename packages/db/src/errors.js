/**
 * A single error type across adapters so UI code can branch on `code`
 * without knowing whether it is talking to the mock or to PostgREST.
 */
export class DataError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}

export const CODES = {
  NOT_FOUND: 'not_found',
  NOT_AUTHENTICATED: 'not_authenticated',
  FORBIDDEN: 'forbidden',
  CONFLICT: 'conflict',
  INVALID: 'invalid',
  NOT_CONFIGURED: 'not_configured',
}
