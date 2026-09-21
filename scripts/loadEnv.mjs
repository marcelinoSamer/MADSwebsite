import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Read .env into a plain object.
 *
 * Deliberately not `process.loadEnvFile` or dotenv: this runs on whatever
 * Node a committee member happens to have, and the file is four lines of
 * KEY=value. Values are taken verbatim — passwords contain `@` and `=`.
 */
export function loadEnv(file = '.env') {
  let raw
  try {
    raw = readFileSync(resolve(ROOT, file), 'utf8')
  } catch {
    throw new Error(
      `Missing ${file}. Copy .env.example to .env and fill it in — see README.md.`,
    )
  }

  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

/** Pull the named keys, failing with all missing ones at once. */
export function require_(env, ...names) {
  const missing = names.filter((name) => !env[name])
  if (missing.length) {
    throw new Error(`.env is missing: ${missing.join(', ')}`)
  }
  return Object.fromEntries(names.map((name) => [name, env[name]]))
}
