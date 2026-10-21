import type { JSX, ReactNode } from 'react'

// Centered narrow column shared by the sign-in, sign-up and password pages.
export const AuthTemplate = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full max-w-sm">{children}</div>
  </div>
)
