import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-sm items-center justify-between px-4 py-3">
        <span className="font-semibold tracking-tight">Drukkerij Drukmans</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
