import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

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
  canCollect: boolean('can_collect').notNull().default(true),
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
export const sessions = pgTable(
  'sessions',
  {
    id: serial().primaryKey(),
    date: timestamp('date').notNull(),
    status: sessionStatusEnum().notNull().default('open'),
    collectorId: integer('collector_id').references(() => people.id),
  },
  (table) => [
    // Enforce at most one open session at a time
    uniqueIndex('one_open_session_idx')
      .on(table.status)
      .where(sql`${table.status} = 'open'`),
  ],
)

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

// Named options that can be attached to menu items (e.g. "Licht gebakken")
export const menuOptions = pgTable('menu_options', {
  id: serial().primaryKey(),
  label: text().notNull(),
})

// Which options are available for which menu items
export const menuItemOptions = pgTable(
  'menu_item_options',
  {
    menuItemId: integer('menu_item_id')
      .notNull()
      .references(() => menuItems.id),
    menuOptionId: integer('menu_option_id')
      .notNull()
      .references(() => menuOptions.id),
  },
  (table) => [primaryKey({ columns: [table.menuItemId, table.menuOptionId] })],
)

// Which options were selected for a given order item
export const orderItemOptions = pgTable('order_item_options', {
  id: serial().primaryKey(),
  orderItemId: integer('order_item_id')
    .notNull()
    .references(() => orderItems.id),
  menuOptionId: integer('menu_option_id')
    .notNull()
    .references(() => menuOptions.id),
})
