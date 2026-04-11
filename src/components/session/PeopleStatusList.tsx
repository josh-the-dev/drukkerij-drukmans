import type { PersonWithStatus } from '#/lib/types'

type Props = {
  people: PersonWithStatus[]
  currentPersonId: number | null
  onOrderFor: (person: PersonWithStatus) => void
}

export function PeopleStatusList({ people, currentPersonId, onOrderFor }: Props) {
  const submittedCount = people.filter((p) => p.submitted).length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bestellingen
        </h2>
        <span className="text-sm text-muted-foreground">
          {submittedCount}/{people.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            isYou={person.id === currentPersonId}
            onOrder={() => onOrderFor(person)}
          />
        ))}
      </div>
    </div>
  )
}

function PersonRow({
  person,
  isYou,
  onOrder,
}: {
  person: PersonWithStatus
  isYou: boolean
  onOrder: () => void
}) {
  return (
    <button
      onClick={onOrder}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition active:scale-95"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{person.name}</span>
        {isYou && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            jij
          </span>
        )}
      </div>
      {person.submitted ? (
        <span className="text-sm font-medium text-green-600">✓</span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      )}
    </button>
  )
}
