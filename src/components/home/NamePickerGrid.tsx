import type { CurrentPerson } from '#/lib/types'

type Props = {
  people: CurrentPerson[]
  onSelect: (person: CurrentPerson) => void
}

export function NamePickerGrid({ people, onSelect }: Props) {
  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Wie ben jij?</h1>
      <p className="mb-8 text-muted-foreground">Kies je naam om te beginnen.</p>
      <div className="grid grid-cols-2 gap-3">
        {people.map((person) => (
          <button
            key={person.id}
            onClick={() => onSelect(person)}
            className="rounded-2xl border border-border bg-card px-4 py-5 text-left text-lg font-semibold shadow-sm transition hover:border-primary hover:bg-accent active:scale-95"
          >
            {person.name}
          </button>
        ))}
      </div>
    </div>
  )
}
