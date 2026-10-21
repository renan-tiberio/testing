'use client'

import { useActionState, useId, useState } from 'react'

import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import { INITIAL_PROJECT_FORM_STATE } from '@/lib/project-form-state'
import { PROJECT_NAME_MAX_LENGTH, validateProjectName } from '@/lib/project-name'
import { cn } from '@/lib/utils'

import type { ProjectFormAction, ProjectFormState } from '@/lib/project-form-state'
import type { JSX, SubmitEvent } from 'react'

export type ProjectNameFormProps = {
  action: ProjectFormAction
  hiddenFields: Record<string, string>
  label: string
  submitLabel: string
  defaultName?: string
  className?: string
}

type StatusView = { role: 'alert' | 'status'; className: string; text: string | null }

// The server message is hidden when it only repeats the field error shown under the input.
const toStatusView = ({
  state,
  fieldError,
}: {
  state: ProjectFormState
  fieldError: string | null
}): StatusView => {
  const isError = state.status === 'error'
  const isRedundant = state.status === 'idle' || state.message === fieldError
  return {
    role: isError ? 'alert' : 'status',
    className: isError ? 'text-red-600' : 'text-green-700',
    text: isRedundant ? null : state.message,
  }
}

// Shared name form: client-side validation first, then the Server Action re-validates.
export const ProjectNameForm = ({
  action,
  hiddenFields,
  label,
  submitLabel,
  defaultName = '',
  className,
}: ProjectNameFormProps): JSX.Element => {
  const [state, formAction, isPending] = useActionState(action, INITIAL_PROJECT_FORM_STATE)
  const [clientError, setClientError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`
  const fieldError = clientError ?? state.fieldError ?? null
  const status = toStatusView({ state, fieldError })

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    const result = validateProjectName({ value: new FormData(event.currentTarget).get('name') })
    if (!result.ok) {
      event.preventDefault()
      setClientError(result.error)
      return
    }
    setClientError(null)
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className={cn('flex flex-col gap-2', className)}
      noValidate
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          name="name"
          defaultValue={defaultName}
          maxLength={PROJECT_NAME_MAX_LENGTH}
          aria-invalid={fieldError !== null}
          aria-describedby={fieldError === null ? undefined : errorId}
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
      {fieldError === null ? null : (
        <p id={errorId} className="text-sm text-red-600">
          {fieldError}
        </p>
      )}
      <p role={status.role} aria-live="polite" className={cn('text-sm', status.className)}>
        {status.text}
      </p>
    </form>
  )
}
