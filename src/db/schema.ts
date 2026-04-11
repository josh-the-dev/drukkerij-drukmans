import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const menuCategoryEnum = pgEnum('menu_category', [
  'frietjes',
  'snack',
  'sauce',
  'drink',
])

export const sessionStatusEnum = pgEnum('session_status', ['open', 'closed'])

// Individual family members
export const people = pgTable('people', {
  id: serial().primaryKey(),
  name: text().notNull(),
})

// Couples who collect together — purely for rotation suggestion logic
export const pairs = pgTable('pairs', {
  id: serial().primaryKey(),
  personAId: integer('person_a_id')
    .notNull()
    .references(() => people.id),
  personBId: integer('person_b_id')
    .notNull()
    .references(() => people.id),
})

export const menuItems = pgTable('menu_items', {
  id: serial().primaryKey(),
  name: text().notNull(),
  category: menuCategoryEnum().notNull(),
  available: boolean().notNull().default(true),
})

// One session per Saturday
export const sessions = pgTable('sessions', {
  id: serial().primaryKey(),
  date: timestamp('date').notNull(),
  status: sessionStatusEnum().notNull().default('open'),
  collectorId: integer('collector_id').references(() => people.id),
})

// One order per person per session
export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => sessions.id),
  personId: integer('person_id')
    .notNull()
    .references(() => people.id),
  submittedAt: timestamp('submitted_at'),
})

// Individual items within an order
export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  menuItemId: integer('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  quantity: integer().notNull().default(1),
  notes: text(),
})
