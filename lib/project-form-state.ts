export type ProjectFormState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  fieldError?: string | null
}

// useActionState imposes the (state, formData) signature; a labeled tuple keeps it as
// one rest parameter for the object-params house rule.
export type ProjectFormAction = (
  ...args: [state: ProjectFormState, formData: FormData]
) => Promise<ProjectFormState>

export const INITIAL_PROJECT_FORM_STATE: ProjectFormState = {
  status: 'idle',
  message: null,
  fieldError: null,
}
