import { parseEnv } from './env-schema.ts'

export type { Env, TrustProxySetting } from './env-schema.ts'

export const env = parseEnv(process.env)
