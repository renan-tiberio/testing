import { AuthTemplate } from '@/components/templates/auth-template'

import type { JSX, ReactNode } from 'react'

const AuthLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <AuthTemplate>{children}</AuthTemplate>
)

export default AuthLayout
