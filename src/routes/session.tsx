import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, isNotNull } from 'drizzle-orm'
import { CollectorCard } from '#/components/session/CollectorCard'
import { PeopleStatusList } from '#/components/session/PeopleStatusList'
import { SessionFooter } from '#/components/session/SessionFooter'
import { db } from '#/db/index'
import { orders, pairs, people, sessions } from '#/db/schema'
import { useLocalStorage } from '#/lib/hooks'
import type { CurrentPerson, PersonWithStatus } from '#/lib/types'

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

// ─── Server function ─────────────────────────────────────────────────────────

const validatePerson = createServerFn()
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    const [person] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.id, id))
      .limit(1)
    return person !== undefined
  })

const getSessionData = createServerFn().handler(async () => {
  const existingSession = await db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'open'))
    .orderBy(desc(sessions.date))
    .limit(1)

  let session = existingSession[0]

  if (!session) {
    const collectorId = await suggestNextCollector()
    const [inserted] = await db
      .insert(sessions)
      .values({ date: new Date(), status: 'open', collectorId })
      .onConflictDoNothing()
      .returning()

    // If two requests raced, fetch whichever won
    session =
      inserted ??
      (
        await db
          .select()
          .from(sessions)
          .where(eq(sessions.status, 'open'))
          .orderBy(desc(sessions.date))
          .limit(1)
      )[0]
  }

  if (!session) throw new Error('Kon sessie niet aanmaken')

  const allPeople = await db.select().from(people).orderBy(people.name)
  const sessionOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.sessionId, session.id))

  const peopleWithStatus: PersonWithStatus[] = allPeople.map((person) => ({
    ...person,
    submitted: sessionOrders.some(
      (o) => o.personId === person.id && o.submittedAt !== null,
    ),
  }))

  const allPairs = await db.select().from(pairs)
  let collectorDisplay: string | null = null

  if (session.collectorId) {
    const collector = allPeople.find((p) => p.id === session.collectorId)
    if (collector) {
      const partnerPair = allPairs.find(
        (p) => p.personAId === collector.id || p.personBId === collector.id,
      )
      if (partnerPair) {
        const partnerId =
          partnerPair.personAId === collector.id
            ? partnerPair.personBId
            : partnerPair.personAId
        const partner = allPeople.find((p) => p.id === partnerId)
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
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('drukmans_person')
    if (!stored) throw redirect({ to: '/' })
    const person = JSON.parse(stored) as { id: number }
    const isValid = await validatePerson({ data: person.id })
    if (!isValid) {
      localStorage.removeItem('drukmans_person')
      throw redirect({ to: '/' })
    }
  },
  loader: () => getSessionData(),
  component: SessionScreen,
})

// ─── Screen ──────────────────────────────────────────────────────────────────

function SessionScreen() {
  const { session, peopleWithStatus, collectorDisplay } = Route.useLoaderData()
  const navigate = useNavigate()

  const currentPerson = useLocalStorage<CurrentPerson>('drukmans_person')

  const myStatus = peopleWithStatus.find((p) => p.id === currentPerson?.id)
  const dateLabel = new Date(session.date).toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col px-4 pb-28 pt-6">
      <div className="mb-6">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Frietjesdag 🍟</h1>
      </div>
      <CollectorCard collectorDisplay={collectorDisplay} />
      <PeopleStatusList
        people={peopleWithStatus}
        currentPersonId={currentPerson?.id ?? null}
        onOrderFor={(person) =>
          navigate({ to: '/order', search: { personId: person.id } })
        }
      />
      <button
        onClick={() => navigate({ to: '/summary' })}
        className="mt-auto pt-6 text-sm text-muted-foreground hover:text-foreground"
      >
        Bekijk overzicht →
      </button>

      {currentPerson && (
        <SessionFooter
          submitted={myStatus?.submitted ?? false}
          onOrder={() =>
            navigate({ to: '/order', search: { personId: currentPerson.id } })
          }
        />
      )}
    </main>
  )
}
