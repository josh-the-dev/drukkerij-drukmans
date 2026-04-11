import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '#/db/index'
import { orders, pairs, people, sessions } from '#/db/schema'

// ─── Collector suggestion ────────────────────────────────────────────────────

async function suggestNextCollector(): Promise<number | null> {
  const allPairs = await db.select().from(pairs)
  const collectors = await db
    .select()
    .from(people)
    .where(eq(people.canCollect, true))

  if (collectors.length === 0) return null

  const pairedIds = new Set([
    ...allPairs.map((p) => p.personAId),
    ...allPairs.map((p) => p.personBId),
  ])

  // Build units — pairs count as one, solos stand alone
  const units: number[][] = [
    ...allPairs.map((p) => [p.personAId, p.personBId]),
    ...collectors.filter((p) => !pairedIds.has(p.id)).map((p) => [p.id]),
  ]

  const recentSessions = await db
    .select({ collectorId: sessions.collectorId, date: sessions.date })
    .from(sessions)
    .where(isNotNull(sessions.collectorId))
    .orderBy(desc(sessions.date))

  const unitLastCollected = units.map((unit) => {
    const last = recentSessions.find(
      (s) => s.collectorId !== null && unit.includes(s.collectorId),
    )
    return { unit, lastDate: last?.date ?? null }
  })

  unitLastCollected.sort((a, b) => {
    if (a.lastDate === null) return -1
    if (b.lastDate === null) return 1
    return a.lastDate.getTime() - b.lastDate.getTime()
  })

  return unitLastCollected[0]?.unit[0] ?? null
}

// ─── Server functions ────────────────────────────────────────────────────────

const getSessionData = createServerFn().handler(async () => {
  // Get or create the current open session
  let [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'open'))
    .orderBy(desc(sessions.date))
    .limit(1)

  if (!session) {
    const collectorId = await suggestNextCollector()
    ;[session] = await db
      .insert(sessions)
      .values({ date: new Date(), status: 'open', collectorId })
      .returning()
  }

  // All people with their order status
  const allPeople = await db.select().from(people).orderBy(people.name)
  const sessionOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.sessionId, session.id))

  const peopleWithStatus = allPeople.map((person) => ({
    ...person,
    submitted: sessionOrders.some(
      (o) => o.personId === person.id && o.submittedAt !== null,
    ),
  }))

  // Collector display name (include partner if paired)
  let collectorDisplay: string | null = null
  if (session.collectorId) {
    const [collector] = allPeople.filter((p) => p.id === session.collectorId)
    if (collector) {
      const allPairs = await db.select().from(pairs)
      const partnerPair = allPairs.find(
        (p) =>
          p.personAId === collector.id || p.personBId === collector.id,
      )
      if (partnerPair) {
        const partnerId =
          partnerPair.personAId === collector.id
            ? partnerPair.personBId
            : partnerPair.personAId
        const [partner] = allPeople.filter((p) => p.id === partnerId)
        collectorDisplay = partner
          ? `${collector.name} & ${partner.name}`
          : collector.name
      } else {
        collectorDisplay = collector.name
      }
    }
  }

  return { session, peopleWithStatus, collectorDisplay }
})

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/session')({
  loader: () => getSessionData(),
  component: SessionScreen,
})

// ─── Component ───────────────────────────────────────────────────────────────

type Person = { id: number; name: string; submitted: boolean }

function SessionScreen() {
  const { session, peopleWithStatus, collectorDisplay } =
    Route.useLoaderData()
  const navigate = useNavigate()

  const [currentPerson, setCurrentPerson] = useState<{
    id: number
    name: string
  } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('drukmans_person')
    if (!stored) {
      navigate({ to: '/' })
      return
    }
    setCurrentPerson(JSON.parse(stored))
  }, [navigate])

  const myStatus = peopleWithStatus.find((p) => p.id === currentPerson?.id)
  const submittedCount = peopleWithStatus.filter((p) => p.submitted).length

  const sessionDate = new Date(session.date)
  const dateLabel = sessionDate.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col px-4 pb-28 pt-6">
      {/* Date + title */}
      <div className="mb-6">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Frietjesdag 🍟</h1>
      </div>

      {/* Collector */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ophalen
        </p>
        <p className="text-lg font-semibold">
          {collectorDisplay ?? 'Nog niet bepaald'}
        </p>
      </div>

      {/* Order status */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bestellingen
        </h2>
        <span className="text-sm text-muted-foreground">
          {submittedCount}/{peopleWithStatus.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {peopleWithStatus.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            isYou={person.id === currentPerson?.id}
          />
        ))}
      </div>

      {/* Sticky CTA */}
      {currentPerson && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 p-4 backdrop-blur">
          <div className="mx-auto max-w-sm">
            <button
              onClick={() => navigate({ to: '/order' })}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow transition active:scale-95"
            >
              {myStatus?.submitted ? 'Bestelling bewerken' : 'Bestelling plaatsen'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function PersonRow({
  person,
  isYou,
}: {
  person: Person
  isYou: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
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
    </div>
  )
}
