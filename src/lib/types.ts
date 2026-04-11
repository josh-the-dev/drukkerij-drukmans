export type Person = {
  id: number
  name: string
  canCollect: boolean
}

export type PersonWithStatus = Person & {
  submitted: boolean
}

export type MenuCategory = 'frietjes' | 'snack' | 'sauce' | 'drink'

export type MenuItem = {
  id: number
  name: string
  category: MenuCategory
  available: boolean
}

export type ItemState = {
  quantity: number
  notes: string
}

export type CurrentPerson = {
  id: number
  name: string
}
