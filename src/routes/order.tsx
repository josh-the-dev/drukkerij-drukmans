import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { CategorySection } from '#/components/order/CategorySection'
import { OrderFooter } from '#/components/order/OrderFooter'
import { db } from '#/db/index'
import {
  menuItemOptions,
  menuItems,
  menuOptions,
  orderItemOptions,
  orderItems,
  orders,
  people,
  sessions,
} from '#/db/schema'
import { useLocalStorage } from '#/lib/hooks'
import type { ItemState, MenuCategory } from '#/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryOrder: MenuCategory[] = ['frietjes', 'snack', 'sauce']

// ─── Server functions ─────────────────────────────────────────────────────────

const getOrderData = createServerFn()
  .inputValidator((data: number) => data)
  .handler(async ({ data: personId }) => {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'open'))
      .orderBy(desc(sessions.date))
      .limit(1)

    const rawMenuItems = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.available, true))
      .orderBy(menuItems.name)

    const optionRows = await db
      .select({
        menuItemId: menuItemOptions.menuItemId,
        optionId: menuOptions.id,
        label: menuOptions.label,
      })
      .from(menuItemOptions)
      .innerJoin(menuOptions, eq(menuItemOptions.menuOptionId, menuOptions.id))

    const optionsByItemId = new Map<number, Array<{ id: number; label: string }>>()
    for (const row of optionRows) {
      const list = optionsByItemId.get(row.menuItemId) ?? []
      list.push({ id: row.optionId, label: row.label })
      optionsByItemId.set(row.menuItemId, list)
    }

    const allMenuItems = rawMenuItems.map((item) => ({
      ...item,
      options: optionsByItemId.get(item.id) ?? [],
    }))

    async function fetchItemsWithOptions(orderId: number) {
      const rows = await db
        .select({
          id: orderItems.id,
          menuItemId: orderItems.menuItemId,
          quantity: orderItems.quantity,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId))

      if (rows.length === 0) return []

      const selectedRows = await db
        .select({
          orderItemId: orderItemOptions.orderItemId,
          menuOptionId: orderItemOptions.menuOptionId,
        })
        .from(orderItemOptions)
        .where(inArray(orderItemOptions.orderItemId, rows.map((r) => r.id)))

      const selectedByOrderItemId = new Map<number, number[]>()
      for (const row of selectedRows) {
        const list = selectedByOrderItemId.get(row.orderItemId) ?? []
        list.push(row.menuOptionId)
        selectedByOrderItemId.set(row.orderItemId, list)
      }

      return rows.map((row) => ({
        menuItemId: row.menuItemId,
        quantity: row.quantity,
        notes: row.notes,
        selectedOptions: selectedByOrderItemId.get(row.id) ?? [],
      }))
    }

    let existingItems: Array<{
      menuItemId: number
      quantity: number
      notes: string | null
      selectedOptions: number[]
    }> = []

    if (session) {
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.sessionId, session.id),
            eq(orders.personId, personId),
          ),
        )
        .limit(1)

      if (existingOrder) {
        existingItems = await fetchItemsWithOptions(existingOrder.id)
      }
    }

    const [person] = await db
      .select({ name: people.name })
      .from(people)
      .where(eq(people.id, personId))
      .limit(1)

    // Most recent order from a previous (closed) session
    const [lastOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(sessions, eq(orders.sessionId, sessions.id))
      .where(
        and(
          eq(orders.personId, personId),
          eq(sessions.status, 'closed'),
        ),
      )
      .orderBy(desc(sessions.date))
      .limit(1)

    const lastOrderItems = lastOrder ? await fetchItemsWithOptions(lastOrder.id) : []

    return {
      session: session ?? null,
      allMenuItems,
      existingItems,
      lastOrderItems,
      personName: person?.name ?? null,
    }
  })

const saveOrder = createServerFn()
  .inputValidator(
    (data: {
      personId: number
      items: Array<{
        menuItemId: number
        quantity: number
        notes: string | null
        selectedOptions: number[]
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'open'))
      .orderBy(desc(sessions.date))
      .limit(1)

    if (!session) throw new Error('Geen open sessie gevonden')

    const existing = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.sessionId, session.id),
          eq(orders.personId, data.personId),
        ),
      )
      .limit(1)

    const order =
      existing[0] ??
      (
        await db
          .insert(orders)
          .values({ sessionId: session.id, personId: data.personId })
          .returning()
      )[0]

    if (!order) throw new Error('Kon bestelling niet aanmaken')

    // Delete existing options before deleting order items (FK constraint)
    const existingOrderItems = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))

    if (existingOrderItems.length > 0) {
      await db
        .delete(orderItemOptions)
        .where(inArray(orderItemOptions.orderItemId, existingOrderItems.map((i) => i.id)))
    }

    await db.delete(orderItems).where(eq(orderItems.orderId, order.id))

    if (data.items.length > 0) {
      const insertedOrderItems = await db
        .insert(orderItems)
        .values(
          data.items.map((item) => ({
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        )
        .returning()

      const optionValues = insertedOrderItems.flatMap((oi, idx) => {
        const item = data.items[idx]
        if (!item) return []
        return item.selectedOptions.map((menuOptionId) => ({
          orderItemId: oi.id,
          menuOptionId,
        }))
      })

      if (optionValues.length > 0) {
        await db.insert(orderItemOptions).values(optionValues)
      }
    }

    await db
      .update(orders)
      .set({ submittedAt: new Date() })
      .where(eq(orders.id, order.id))
  })

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/order')({
  validateSearch: (search: Record<string, unknown>) => ({
    personId: Number(search.personId),
  }),
  beforeLoad: ({ search }) => {
    if (typeof window !== 'undefined' && !localStorage.getItem('drukmans_person')) {
      throw redirect({ to: '/' })
    }
    if (isNaN(search.personId)) {
      throw redirect({ to: '/' })
    }
  },
  loaderDeps: ({ search }) => ({ personId: search.personId }),
  loader: ({ deps }) => getOrderData({ data: deps.personId }),
  component: OrderScreen,
})

// ─── Screen ──────────────────────────────────────────────────────────────────

function OrderScreen() {
  const { allMenuItems, existingItems, lastOrderItems, personName } = Route.useLoaderData()
  const { personId } = Route.useSearch()

  const currentPerson = useLocalStorage<{ id: number }>('drukmans_person')
  const isForSelf = currentPerson?.id === personId
  const navigate = useNavigate()

  const [search, setSearch] = useState('')

  const [orderState, setOrderState] = useState<Record<number, ItemState>>(
    () => {
      const initial: Record<number, ItemState> = {}
      for (const item of existingItems) {
        initial[item.menuItemId] = {
          quantity: item.quantity,
          notes: item.notes ?? '',
          selectedOptions: item.selectedOptions,
        }
      }
      return initial
    },
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  function handleRepeatLastOrder() {
    const repeated: Record<number, ItemState> = {}
    for (const item of lastOrderItems) {
      repeated[item.menuItemId] = {
        quantity: item.quantity,
        notes: item.notes ?? '',
        selectedOptions: item.selectedOptions,
      }
    }
    setOrderState(repeated)
  }

  const query = search.trim().toLowerCase()
  const filteredItems = query
    ? allMenuItems.filter((item) => item.name.toLowerCase().includes(query))
    : allMenuItems

  const grouped = categoryOrder.reduce<Record<MenuCategory, typeof allMenuItems>>(
    (acc, cat) => {
      acc[cat] = filteredItems.filter((item) => item.category === cat)
      return acc
    },
    { frietjes: [], snack: [], sauce: [], drink: [] },
  )

  function setQuantity(menuItemId: number, quantity: number) {
    setOrderState((prev) => {
      if (quantity <= 0) {
        const next = { ...prev }
        delete next[menuItemId]
        return next
      }
      return {
        ...prev,
        [menuItemId]: {
          quantity,
          notes: prev[menuItemId]?.notes ?? '',
          selectedOptions: prev[menuItemId]?.selectedOptions ?? [],
        },
      }
    })
  }

  function setNotes(menuItemId: number, notes: string) {
    setOrderState((prev) => ({
      ...prev,
      [menuItemId]: { ...prev[menuItemId], notes },
    }))
  }

  function toggleOption(menuItemId: number, optionId: number) {
    setOrderState((prev) => {
      const current = prev[menuItemId]
      if (!current) return prev
      const has = current.selectedOptions.includes(optionId)
      return {
        ...prev,
        [menuItemId]: {
          ...current,
          selectedOptions: has
            ? current.selectedOptions.filter((id) => id !== optionId)
            : [...current.selectedOptions, optionId],
        },
      }
    })
  }

  async function handleSubmit() {
    setSaving(true)
    setSaveError(false)
    try {
      const items = Object.entries(orderState).map(([id, state]) => ({
        menuItemId: Number(id),
        quantity: state.quantity,
        notes: state.notes || null,
        selectedOptions: state.selectedOptions,
      }))
      await saveOrder({ data: { personId, items } })
      navigate({ to: '/session' })
    } catch (err) {
      console.error('Failed to save order:', err)
      setSaveError(true)
      setSaving(false)
    }
  }

  const totalItems = Object.values(orderState).reduce(
    (sum, s) => sum + s.quantity,
    0,
  )

  return (
    <main className="mx-auto max-w-sm px-4 pb-32 pt-6">
      <button
        onClick={() => navigate({ to: '/session' })}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Terug
      </button>
      <h1 className="mb-3 text-3xl font-bold tracking-tight">
        {isForSelf ? 'Jouw bestelling' : `Bestelling voor ${personName}`}
      </h1>
      {lastOrderItems.length > 0 && (
        <button
          onClick={handleRepeatLastOrder}
          className="mb-6 text-sm text-muted-foreground hover:text-foreground"
        >
          ↩ Herhaal vorige bestelling
        </button>
      )}
      <input
        type="search"
        placeholder="Zoeken…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex flex-col gap-8">
        {categoryOrder.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            items={grouped[cat]}
            orderState={orderState}
            onQuantityChange={setQuantity}
            onNotesChange={setNotes}
            onOptionToggle={toggleOption}
          />
        ))}
      </div>
      {saveError && (
        <p className="mt-4 text-sm text-destructive">
          Er ging iets mis. Probeer opnieuw.
        </p>
      )}
      <OrderFooter totalItems={totalItems} saving={saving} onSubmit={handleSubmit} />
    </main>
  )
}
