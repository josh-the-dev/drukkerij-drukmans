import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { NamePickerGrid } from '#/components/home/NamePickerGrid'
import { db } from '#/db/index'
import { people } from '#/db/schema'
import type { CurrentPerson } from '#/lib/types'

const getPeople = createServerFn().handler(async () => {
  return db.select().from(people).orderBy(people.name)
})

export const Route = createFileRoute('/')({
  loader: () => getPeople(),
  component: NamePickerScreen,
})

function NamePickerScreen() {
  const allPeople = Route.useLoaderData()
  const navigate = useNavigate()

  function selectPerson(person: CurrentPerson) {
    localStorage.setItem('drukmans_person', JSON.stringify(person))
    navigate({ to: '/session' })
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <NamePickerGrid people={allPeople} onSelect={selectPerson} />
    </main>
  )
}
