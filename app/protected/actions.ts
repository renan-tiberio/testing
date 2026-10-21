'use server'

import { revalidatePath } from 'next/cache'

import { validateProjectName } from '@/lib/project-name'
import { createClient } from '@/lib/supabase/server'
import { canWrite, getCurrentUser, listMyMemberships } from '@/lib/tenancy'

import type { ProjectFormState } from '@/lib/project-form-state'
import type { PostgrestError } from '@supabase/supabase-js'

const NO_PERMISSION = 'You do not have permission to change projects in this tenant.'
const DUPLICATE_NAME = 'A project with that name already exists in this tenant.'
const GENERIC_FAILURE = 'Could not save the project. Try again.'
const NOT_FOUND = 'Project not found, or you do not have permission to rename it.'

const errorState = ({
  message,
  fieldError = null,
}: {
  message: string
  fieldError?: string | null
}): ProjectFormState => ({ status: 'error', message, fieldError })

const readField = ({ formData, key }: { formData: FormData; key: string }): string => {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

// Application-level check; RLS on projects is the second layer.
const authorizeWrite = async ({
  tenantId,
}: {
  tenantId: string
}): Promise<ProjectFormState | null> => {
  const user = await getCurrentUser()
  if (user === null) return errorState({ message: 'You must be signed in.' })
  if (tenantId === '') return errorState({ message: NO_PERMISSION })
  try {
    const memberships = await listMyMemberships()
    const membership = memberships.find((item) => item.tenantId === tenantId)
    if (membership === undefined || !canWrite(membership.role)) {
      return errorState({ message: NO_PERMISSION })
    }
    return null
  } catch (error: unknown) {
    console.error('authorizeWrite failed', error)
    return errorState({ message: GENERIC_FAILURE })
  }
}

const mapDbError = ({ error }: { error: PostgrestError }): ProjectFormState => {
  if (error.code === '23505')
    return errorState({ message: DUPLICATE_NAME, fieldError: DUPLICATE_NAME })
  if (error.code === '42501') return errorState({ message: NO_PERMISSION })
  console.error('project write failed', error)
  return errorState({ message: GENERIC_FAILURE })
}

export const createProject = async (
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> => {
  const tenantId = readField({ formData, key: 'tenantId' })
  const denied = await authorizeWrite({ tenantId })
  if (denied !== null) return denied

  const validation = validateProjectName({ value: formData.get('name') })
  if (!validation.ok) return errorState({ message: validation.error, fieldError: validation.error })

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .insert({ tenant_id: tenantId, name: validation.name })
  if (error !== null) return mapDbError({ error })

  revalidatePath('/protected')
  return { status: 'success', message: `Project "${validation.name}" created.`, fieldError: null }
}

export const renameProject = async (
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> => {
  const tenantId = readField({ formData, key: 'tenantId' })
  const projectId = readField({ formData, key: 'projectId' })
  const denied = await authorizeWrite({ tenantId })
  if (denied !== null) return denied
  if (projectId === '') return errorState({ message: NOT_FOUND })

  const validation = validateProjectName({ value: formData.get('name') })
  if (!validation.ok) return errorState({ message: validation.error, fieldError: validation.error })

  const supabase = await createClient()
  // An update blocked by RLS affects zero rows without an error: check the returned row.
  const { data, error } = await supabase
    .from('projects')
    .update({ name: validation.name })
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .select('id')
    .maybeSingle()
  if (error !== null) return mapDbError({ error })
  if (data === null) return errorState({ message: NOT_FOUND })

  revalidatePath('/protected')
  return {
    status: 'success',
    message: `Project renamed to "${validation.name}".`,
    fieldError: null,
  }
}
