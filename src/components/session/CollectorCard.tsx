type Props = {
  collectorDisplay: string | null
}

export function CollectorCard({ collectorDisplay }: Props) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Ophalen
      </p>
      <p className="text-lg font-semibold">
        {collectorDisplay ?? 'Nog niet bepaald'}
      </p>
    </div>
  )
}
