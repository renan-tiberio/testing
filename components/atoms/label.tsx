'use client'

import { Root as LabelRoot } from '@radix-ui/react-label'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps, JSX } from 'react'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

export const Label = ({
  className,
  ...props
}: ComponentProps<typeof LabelRoot> & VariantProps<typeof labelVariants>): JSX.Element => (
  <LabelRoot className={cn(labelVariants(), className)} {...props} />
)
