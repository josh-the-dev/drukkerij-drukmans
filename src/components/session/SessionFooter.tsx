type Props = {
  submitted: boolean
  onOrder: () => void
}

export function SessionFooter({ submitted, onOrder }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 p-4 backdrop-blur">
      <div className="mx-auto max-w-sm">
        <button
          onClick={onOrder}
          className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow transition active:scale-95"
        >
          {submitted ? 'Bestelling bewerken' : 'Bestelling plaatsen'}
        </button>
      </div>
    </div>
  )
}
