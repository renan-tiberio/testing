import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card'

import type { JSX } from 'react'

const Page = (): JSX.Element => (
  <div className="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Thank you for signing up!</CardTitle>
        <CardDescription>Check your email to confirm</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You&apos;ve successfully signed up. Please check your email to confirm your account before
          signing in.
        </p>
      </CardContent>
    </Card>
  </div>
)

export default Page
