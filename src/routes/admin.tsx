import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { useState } from 'react'
import { db } from '#/db/index'
import { menuItems, orderItems, orders, people, sessions } from '#/db/schema'
import { useLocalStorage } from '#/lib/hooks'
import type { MenuCategory } from '#/lib/types'

// ─── Auth ─────────────────────────────────────────────────────────────────────

function assertAdmin(token: string) {
  const passcode = process.env.ADMIN_PASSCODE
  if (!passcode || token !== passcode) throw new Error('Niet geautoriseerd')
}

// ─── Server functions ─────────────────────────────────────────────────────────

const getAdminData = createServerFn().handler(async () => {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'open'))
    .orderBy(desc(sessions.date))
    .limit(1)

  const allPeople = await db
    .select()
    .from(people)
    .orderBy(people.name)

  const allMenuItems = await db
    .select()
    .from(menuItems)
    .orderBy(menuItems.category, menuItems.name)

  const submittedOrders = session
    ? await db
        .select({ personId: orders.personId })
        .from(orders)
        .where(and(eq(orders.sessionId, session.id), isNotNull(orders.submittedAt)))
        .then((rows) => rows.map((r) => r.personId))
    : []

  const submittedPeople = allPeople.filter((p) => submittedOrders.includes(p.id))

  return {
    session: session ?? null,
    collectors: allPeople.filter((p) => p.canCollect),
    submittedPeople,
    allMenuItems,
  }
})

const closeSession = createServerFn()
  .inputValidator((data: { sessionId: number; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    await db
      .update(sessions)
      .set({ status: 'closed' })
      .where(eq(sessions.id, data.sessionId))
  })

const setCollector = createServerFn()
  .inputValidator((data: { sessionId: number; personId: number; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    await db
      .update(sessions)
      .set({ collectorId: data.personId })
      .where(eq(sessions.id, data.sessionId))
  })

const setSessionDate = createServerFn()
  .inputValidator((data: { sessionId: number; date: string; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    await db
      .update(sessions)
      .set({ date: new Date(data.date) })
      .where(eq(sessions.id, data.sessionId))
  })

const clearOrder = createServerFn()
  .inputValidator((data: { sessionId: number; personId: number; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.sessionId, data.sessionId), eq(orders.personId, data.personId)))
      .limit(1)
    if (!order) return
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id))
    await db.delete(orders).where(eq(orders.id, order.id))
  })

const toggleMenuItem = createServerFn()
  .inputValidator((data: { itemId: number; available: boolean; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    await db
      .update(menuItems)
      .set({ available: data.available })
      .where(eq(menuItems.id, data.itemId))
  })

const addMenuItem = createServerFn()
  .inputValidator((data: { name: string; category: MenuCategory; token: string }) => data)
  .handler(async ({ data }) => {
    assertAdmin(data.token)
    await db
      .insert(menuItems)
      .values({ name: data.name, category: data.category, available: true })
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('drukmans_admin')) {
      throw redirect({ to: '/admin-login' })
    }
  },
  loader: () => getAdminData(),
  component: AdminScreen,
})

// ─── Screen ──────────────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  frietjes: 'Frietjes',
  snack: 'Snacks',
  sauce: 'Sauzen',
}

const categoryOrder: MenuCategory[] = ['frietjes', 'snack', 'sauce']

function AdminScreen() {
  const { session, collectors, submittedPeople, allMenuItems } = Route.useLoaderData()
  const router = useRouter()
  const token = useLocalStorage<string>('drukmans_admin') ?? ''

  async function handleCloseSession() {
    if (!session) return
    await closeSession({ data: { sessionId: session.id, token } })
    router.invalidate()
  }

  async function handleSetDate(date: string) {
    if (!session) return
    await setSessionDate({ data: { sessionId: session.id, date, token } })
    router.invalidate()
  }

  async function handleSetCollector(personId: number) {
    if (!session) return
    await setCollector({ data: { sessionId: session.id, personId, token } })
    router.invalidate()
  }

  async function handleToggleItem(itemId: number, available: boolean) {
    await toggleMenuItem({ data: { itemId, available, token } })
    router.invalidate()
  }

  async function handleClearOrder(personId: number) {
    if (!session) return
    await clearOrder({ data: { sessionId: session.id, personId, token } })
    router.invalidate()
  }

  async function handleAddItem(name: string, category: MenuCategory) {
    await addMenuItem({ data: { name, category, token } })
    router.invalidate()
  }

  return (
    <main className="mx-auto max-w-sm px-4 pb-16 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Admin</h1>

      {/* Session */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sessie
        </h2>
        {session ? (
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Huidige sessie</p>
              <p className="font-medium">
                {new Date(session.date).toLocaleDateString('nl-BE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="date-input">
                Datum
              </label>
              <input
                id="date-input"
                type="date"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={new Date(session.date).toISOString().slice(0, 10)}
                onChange={(e) => handleSetDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="collector-select">
                Afhaaldienst
              </label>
              <select
                id="collector-select"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={session.collectorId ?? ''}
                onChange={(e) => handleSetCollector(Number(e.target.value))}
              >
                <option value="" disabled>
                  Kies een persoon…
                </option>
                {collectors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCloseSession}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              Sessie sluiten
            </button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Geen open sessie. De volgende bezoeker start er automatisch een.
            </p>
          </div>
        )}
      </section>

      {/* Orders */}
      {session && submittedPeople.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Bestellingen
          </h2>
          <div className="flex flex-col gap-1">
            {submittedPeople.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
              >
                <span className="text-sm">{person.name}</span>
                <button
                  onClick={() => handleClearOrder(person.id)}
                  className="rounded px-2 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                >
                  Wissen
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </h2>
        <div className="flex flex-col gap-6">
          {categoryOrder.map((cat) => {
            const items = allMenuItems.filter((i) => i.category === cat)
            return (
              <div key={cat}>
                <p className="mb-2 text-sm font-semibold">{categoryLabels[cat]}</p>
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                    >
                      <span
                        className={
                          item.available
                            ? 'text-sm'
                            : 'text-sm text-muted-foreground line-through'
                        }
                      >
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleToggleItem(item.id, !item.available)}
                        className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                          item.available
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.available ? 'Beschikbaar' : 'Uit'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <AddItemForm onAdd={handleAddItem} />
      </section>
    </main>
  )
}

// ─── Add item form ────────────────────────────────────────────────────────────

function AddItemForm({ onAdd }: { onAdd: (name: string, category: MenuCategory) => Promise<void> }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MenuCategory>('snack')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name.trim(), category)
    setName('')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
      <p className="text-sm font-semibold">Nieuw item toevoegen</p>
      <input
        type="text"
        placeholder="Naam"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as MenuCategory)}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="frietjes">Frietjes</option>
        <option value="snack">Snack</option>
        <option value="sauce">Saus</option>
      </select>
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Bezig…' : 'Toevoegen'}
      </button>
    </form>
  )
}

