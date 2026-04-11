import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { db } from '#/db/index'
import { people } from '#/db/schema'

const getPeople = createServerFn().handler(async () => {
  return db.select().from(people).orderBy(people.name)
})

export const Route = createFileRoute('/')({
  loader: () => getPeople(),
  component: NamePicker,
})

type Person = { id: number; name: string }

function NamePicker() {
  const allPeople = Route.useLoaderData()

  const [selected, setSelected] = useState<Person | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('drukmans_person')
    return stored ? JSON.parse(stored) : null
  })

  function selectPerson(person: Person) {
    localStorage.setItem('drukmans_person', JSON.stringify(person))
    setSelected(person)
  }

  function clearPerson() {
    localStorage.removeItem('drukmans_person')
    setSelected(null)
  }

  if (selected) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="mb-1 text-sm font-medium text-muted-foreground">
            Hey,
          </p>
          <h1 className="mb-8 text-5xl font-bold tracking-tight">
            {selected.name}
          </h1>
          <p className="mb-8 text-muted-foreground">
            Ready to order your frietjes? 🍟
          </p>
          <button
            onClick={clearPerson}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Not you?
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Wie ben jij?
        </h1>
        <p className="mb-8 text-muted-foreground">Kies je naam om te beginnen.</p>
        <div className="grid grid-cols-2 gap-3">
          {allPeople.map((person) => (
            <button
              key={person.id}
              onClick={() => selectPerson(person)}
              className="rounded-2xl border border-border bg-card px-4 py-5 text-left text-lg font-semibold shadow-sm transition hover:border-primary hover:bg-accent active:scale-95"
            >
              {person.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
