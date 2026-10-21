// Read at import time so a missing variable fails at startup instead of as a vague
// Supabase error on the first request. NEXT_PUBLIC_* values are inlined at build
// time, so each one is read with its literal name.
const requireEnv = ({ name, value }: { name: string; value: string | undefined }): string => {
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
  }
  return value
}

export const SUPABASE_URL = requireEnv({
  name: 'NEXT_PUBLIC_SUPABASE_URL',
  value: process.env.NEXT_PUBLIC_SUPABASE_URL,
})

export const SUPABASE_PUBLISHABLE_KEY = requireEnv({
  name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
})
