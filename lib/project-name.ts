export const PROJECT_NAME_MAX_LENGTH = 80

export type ProjectNameResult = { ok: true; name: string } | { ok: false; error: string }

// Mirrors the DB CHECK (name = btrim(name), length 1..80) so the UI can fail fast.
export const validateProjectName = ({ value }: { value: unknown }): ProjectNameResult => {
  if (typeof value !== 'string') {
    return { ok: false, error: 'Project name is required.' }
  }
  const name = value.trim()
  if (name === '') {
    return { ok: false, error: 'Project name is required.' }
  }
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Project name must be at most ${String(PROJECT_NAME_MAX_LENGTH)} characters.`,
    }
  }
  return { ok: true, name }
}
