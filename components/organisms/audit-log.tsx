import type { AuditEntry } from '@/lib/projects'
import type { JSX } from 'react'

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const describe = ({
  entry: {
    action,
    details: { name, from, to },
  },
}: {
  entry: AuditEntry
}): string => {
  if (action === 'project.created' && typeof name === 'string') return `Created "${name}"`
  if (action === 'project.renamed' && typeof from === 'string' && typeof to === 'string') {
    return `Renamed "${from}" to "${to}"`
  }
  return action
}

export const AuditLog = ({ entries }: { entries: AuditEntry[] | null }): JSX.Element => {
  if (entries === null) {
    return <p className="text-sm text-red-600">Could not load recent activity.</p>
  }
  const [latest] = entries
  if (latest === undefined) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>
  }
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex justify-between gap-4">
          <span>{describe({ entry })}</span>
          <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">
            {TIMESTAMP_FORMAT.format(new Date(entry.createdAt))} UTC
          </time>
        </li>
      ))}
    </ul>
  )
}
