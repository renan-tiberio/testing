import { Suspense } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card'

import type { JSX } from 'react'

type ErrorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const ErrorContent = async ({ searchParams }: ErrorPageProps): Promise<JSX.Element> => {
  const { error } = await searchParams

  if (typeof error !== 'string' || error === '') {
    return <p className="text-sm text-muted-foreground">An unspecified error occurred.</p>
  }

  return <p className="text-sm text-muted-foreground">Code error: {error}</p>
}

const Page = ({ searchParams }: ErrorPageProps): JSX.Element => (
  <div className="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense>
          <ErrorContent searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  </div>
)

export default Page
