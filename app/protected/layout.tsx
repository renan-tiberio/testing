import { MainTemplate } from '@/components/templates/main-template'

import type { JSX, ReactNode } from 'react'

const ProtectedLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <MainTemplate>{children}</MainTemplate>
)

export default ProtectedLayout
