import { ProjectNameForm } from '@/components/molecules/project-name-form'

import type { ProjectFormAction } from '@/lib/project-form-state'
import type { Project } from '@/lib/projects'
import type { JSX } from 'react'

const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' })

export type ProjectListProps = {
  tenantId: string
  projects: Project[] | null
  renameAction: ProjectFormAction | null
}

// `projects === null` means the query failed; `renameAction === null` means read-only.
export const ProjectList = ({
  tenantId,
  projects,
  renameAction,
}: ProjectListProps): JSX.Element => {
  if (projects === null) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Could not load projects.
      </p>
    )
  }
  const [newest] = projects
  if (newest === undefined) {
    return <p className="text-sm text-muted-foreground">No projects yet.</p>
  }
  return (
    <ul className="flex flex-col divide-y rounded-md border">
      {projects.map((project) => (
        <li key={project.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-medium">{project.name}</span>
            <time dateTime={project.createdAt} className="text-xs text-muted-foreground">
              {DATE_FORMAT.format(new Date(project.createdAt))}
            </time>
          </div>
          {renameAction === null ? null : (
            <ProjectNameForm
              action={renameAction}
              hiddenFields={{ tenantId, projectId: project.id }}
              label={`Rename "${project.name}"`}
              submitLabel="Rename"
              defaultName={project.name}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
