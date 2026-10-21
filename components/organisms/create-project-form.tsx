import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card'
import { ProjectNameForm } from '@/components/molecules/project-name-form'

import type { ProjectFormAction } from '@/lib/project-form-state'
import type { JSX } from 'react'

export const CreateProjectForm = ({
  tenantId,
  action,
}: {
  tenantId: string
  action: ProjectFormAction
}): JSX.Element => (
  <Card>
    <CardHeader>
      <CardTitle>New project</CardTitle>
    </CardHeader>
    <CardContent>
      <ProjectNameForm
        action={action}
        hiddenFields={{ tenantId }}
        label="Project name"
        submitLabel="Create project"
      />
    </CardContent>
  </Card>
)
