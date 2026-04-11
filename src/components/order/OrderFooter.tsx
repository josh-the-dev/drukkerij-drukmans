type Props = {
  totalItems: number
  saving: boolean
  onSubmit: () => void
}

export function OrderFooter({ totalItems, saving, onSubmit }: Props) {
  const label = saving
    ? 'Opslaan...'
    : totalItems === 0
      ? 'Kies iets'
      : `Bestelling plaatsen (${totalItems} item${totalItems !== 1 ? 's' : ''})`

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 p-4 backdrop-blur">
      <div className="mx-auto max-w-sm">
        <button
          onClick={onSubmit}
          disabled={saving || totalItems === 0}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow transition active:scale-95 disabled:opacity-50"
        >
          {label}
        </button>
      </div>
    </div>
  )
}
