import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/db/index'
import { menuOptions, orderItemOptions, orderItems, orders, people, sessions, menuItems } from '#/db/schema'
import type { MenuCategory } from '#/lib/types'

// ─── Server function ──────────────────────────────────────────────────────────

const getSummaryData = createServerFn().handler(async () => {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'open'))
    .orderBy(desc(sessions.date))
    .limit(1)

  if (!session) return { session: null, byItem: [], byPerson: [] }

  const rows = await db
    .select({
      orderItemId: orderItems.id,
      personId: people.id,
      personName: people.name,
      menuItemId: menuItems.id,
      menuItemName: menuItems.name,
      category: menuItems.category,
      quantity: orderItems.quantity,
      notes: orderItems.notes,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(people, eq(orders.personId, people.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(eq(orders.sessionId, session.id))

  // Fetch selected options for all order items in this session
  const optionsByOrderItemId = new Map<number, string[]>()
  if (rows.length > 0) {
    const optionRows = await db
      .select({
        orderItemId: orderItemOptions.orderItemId,
        label: menuOptions.label,
      })
      .from(orderItemOptions)
      .innerJoin(menuOptions, eq(orderItemOptions.menuOptionId, menuOptions.id))
      .where(inArray(orderItemOptions.orderItemId, rows.map((r) => r.orderItemId)))

    for (const row of optionRows) {
      const list = optionsByOrderItemId.get(row.orderItemId) ?? []
      list.push(row.label)
      optionsByOrderItemId.set(row.orderItemId, list)
    }
  }

  // Totals grouped by item
  const itemMap = new Map<
    number,
    {
      name: string
      category: MenuCategory
      total: number
      notes: Array<{ personName: string; note: string; quantity: number }>
      optionCounts: Map<string, number>
    }
  >()
  for (const row of rows) {
    const options = optionsByOrderItemId.get(row.orderItemId) ?? []
    const existing = itemMap.get(row.menuItemId)
    if (existing) {
      existing.total += row.quantity
      if (row.notes) {
        existing.notes.push({ personName: row.personName, note: row.notes, quantity: row.quantity })
      }
      for (const label of options) {
        existing.optionCounts.set(label, (existing.optionCounts.get(label) ?? 0) + row.quantity)
      }
    } else {
      const optionCounts = new Map<string, number>()
      for (const label of options) {
        optionCounts.set(label, row.quantity)
      }
      itemMap.set(row.menuItemId, {
        name: row.menuItemName,
        category: row.category,
        total: row.quantity,
        notes: row.notes
          ? [{ personName: row.personName, note: row.notes, quantity: row.quantity }]
          : [],
        optionCounts,
      })
    }
  }
  const byItem = Array.from(itemMap.values())
    .map((item) => ({
      ...item,
      optionTotals: Array.from(item.optionCounts.entries()).map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) =>
      a.category === b.category
        ? a.name.localeCompare(b.name)
        : categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category),
    )

  // Breakdown grouped by person
  const personMap = new Map<
    number,
    {
      name: string
      items: Array<{ name: string; quantity: number; notes: string | null; options: string[] }>
    }
  >()
  for (const row of rows) {
    const options = optionsByOrderItemId.get(row.orderItemId) ?? []
    const existing = personMap.get(row.personId)
    if (existing) {
      existing.items.push({ name: row.menuItemName, quantity: row.quantity, notes: row.notes, options })
    } else {
      personMap.set(row.personId, {
        name: row.personName,
        items: [{ name: row.menuItemName, quantity: row.quantity, notes: row.notes, options }],
      })
    }
  }
  const byPerson = Array.from(personMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return { session, byItem, byPerson }
})

// ─── Route ────────────────────────────────────────────────────────────────────

const categoryOrder: MenuCategory[] = ['frietjes', 'snack', 'sauce']

const categoryLabels: Record<string, string> = {
  frietjes: 'Frietjes',
  snack: 'Snacks',
  sauce: 'Sauzen',
}

export const Route = createFileRoute('/summary')({
  loader: () => getSummaryData(),
  component: SummaryScreen,
})

// ─── Screen ──────────────────────────────────────────────────────────────────

function SummaryScreen() {
  const { session, byItem, byPerson } = Route.useLoaderData()
  const navigate = useNavigate()

  if (!session) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">Geen open sessie.</p>
      </main>
    )
  }

  const dateLabel = new Date(session.date).toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Group byItem by category for display
  const grouped = categoryOrder.reduce<
    Record<MenuCategory, typeof byItem>
  >(
    (acc, cat) => {
      acc[cat] = byItem.filter((i) => i.category === cat)
      return acc
    },
    { frietjes: [], snack: [], sauce: [], drink: [] },
  )

  return (
    <main className="mx-auto max-w-sm px-4 pb-16 pt-6">
      <button
        onClick={() => navigate({ to: '/session' })}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Terug
      </button>
      <p className="text-sm font-medium capitalize text-muted-foreground">{dateLabel}</p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Overzicht</h1>

      {byItem.length === 0 ? (
        <p className="text-muted-foreground">Nog geen bestellingen.</p>
      ) : (
        <>
          {/* Totals by item */}
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Totaal te bestellen
            </h2>
            <div className="flex flex-col gap-6">
              {categoryOrder.map((cat) => {
                const items = grouped[cat]
                if (items.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="mb-2 text-sm font-semibold text-muted-foreground">
                      {categoryLabels[cat]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {items.map((item) => (
                        <div
                          key={item.name}
                          className="rounded-md border bg-card px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{item.name}</span>
                            <span className="text-sm font-semibold">×{item.total}</span>
                          </div>
                          {item.optionTotals.length > 0 && (
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {item.optionTotals.map((opt) => (
                                <li key={opt.label} className="text-xs text-muted-foreground">
                                  {opt.label}: ×{opt.count}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.notes.length > 0 && (
                            <ul className="mt-1.5 flex flex-col gap-0.5">
                              {item.notes.map((n, i) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                  {n.personName}: {n.note}{n.quantity > 1 ? ` (×${n.quantity})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Per person */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Per persoon
            </h2>
            <div className="flex flex-col gap-3">
              {byPerson.map((person) => (
                <div key={person.name} className="rounded-lg border bg-card p-3">
                  <p className="mb-2 text-sm font-semibold">{person.name}</p>
                  <div className="flex flex-col gap-1">
                    {person.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          {item.options.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {item.options.join(', ')}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-xs text-muted-foreground">{item.notes}</span>
                          )}
                        </div>
                        <span className="text-sm shrink-0">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
