import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/order')({
  component: OrderScreen,
})

function OrderScreen() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Jouw bestelling</h1>
      <p className="mt-2 text-muted-foreground">Komt eraan...</p>
    </main>
  )
}
