import type { ItemState, MenuCategory, MenuItem } from '#/lib/types'

const categoryLabels: Record<MenuCategory, string> = {
  frietjes: 'Frietjes',
  snack: 'Snacks',
  sauce: 'Sauzen',
  drink: 'Dranken',
}

type Props = {
  category: MenuCategory
  items: MenuItem[]
  orderState: Record<number, ItemState>
  onQuantityChange: (menuItemId: number, quantity: number) => void
  onNotesChange: (menuItemId: number, notes: string) => void
}

export function CategorySection({
  category,
  items,
  orderState,
  onQuantityChange,
  onNotesChange,
}: Props) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {categoryLabels[category]}
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <OrderItem
            key={item.id}
            item={item}
            state={orderState[item.id]}
            onQuantityChange={onQuantityChange}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>
    </section>
  )
}

function OrderItem({
  item,
  state,
  onQuantityChange,
  onNotesChange,
}: {
  item: MenuItem
  state: ItemState | undefined
  onQuantityChange: (menuItemId: number, quantity: number) => void
  onNotesChange: (menuItemId: number, notes: string) => void
}) {
  const qty = state?.quantity ?? 0

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{item.name}</span>
        <div className="flex items-center gap-3">
          {qty > 0 && (
            <button
              onClick={() => onQuantityChange(item.id, qty - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg leading-none transition active:scale-90"
            >
              −
            </button>
          )}
          {qty > 0 && (
            <span className="w-4 text-center font-semibold">{qty}</span>
          )}
          <button
            onClick={() => onQuantityChange(item.id, qty + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg leading-none transition active:scale-90"
          >
            +
          </button>
        </div>
      </div>
      {qty > 0 && (
        <input
          type="text"
          placeholder="Opmerking (bv. extra crispy)"
          value={state?.notes ?? ''}
          onChange={(e) => onNotesChange(item.id, e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </div>
  )
}
