import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set')

const db = drizzle(databaseUrl, { schema })

async function seed() {
  console.log('Clearing existing data...')
  await db.delete(schema.orderItems)
  await db.delete(schema.orders)
  await db.delete(schema.sessions)
  await db.delete(schema.pairs)
  await db.delete(schema.menuItems)
  await db.delete(schema.people)

  console.log('Seeding people...')

  const insertedPeople = await db
    .insert(schema.people)
    .values([
      { name: 'Josh', canCollect: true },
      { name: 'Rani', canCollect: true },
      { name: 'Sonja', canCollect: true },
      { name: 'Eddy', canCollect: true },
      { name: 'Matthias', canCollect: true },
      { name: 'Thomas', canCollect: true },
      { name: 'Mercedes', canCollect: true },
      { name: 'Lio', canCollect: false },
      { name: 'Alexis', canCollect: false },
      { name: 'Pieter', canCollect: false },
    ])
    .returning()

  const byName = Object.fromEntries(insertedPeople.map((p) => [p.name, p]))

  console.log('Seeding pairs...')

  await db.insert(schema.pairs).values([
    { personAId: byName['Josh'].id, personBId: byName['Rani'].id },
    { personAId: byName['Thomas'].id, personBId: byName['Mercedes'].id },
  ])

  console.log('Seeding menu...')

  await db.insert(schema.menuItems).values([
    // Frietjes
    { name: 'Frietjes klein', category: 'frietjes' },
    { name: 'Frietjes medium', category: 'frietjes' },
    { name: 'Frietjes groot', category: 'frietjes' },
    // Snacks
    { name: 'Frikandel', category: 'snack' },
    { name: 'Boulette', category: 'snack' },
    { name: 'Kaaskroket', category: 'snack' },
    { name: 'Kippenboutje', category: 'snack' },
    { name: 'Chicken nuggets', category: 'snack' },
    { name: 'Mexicano', category: 'snack' },
    { name: 'Bicky Burger', category: 'snack' },
    { name: 'Merguez', category: 'snack' },
    { name: 'Saté', category: 'snack' },
    // Sauces
    { name: 'Mayonaise', category: 'sauce' },
    { name: 'Ketchup', category: 'sauce' },
    { name: 'Andalouse', category: 'sauce' },
    { name: 'Samurai', category: 'sauce' },
    { name: 'Cocktail', category: 'sauce' },
    { name: 'Curryketchup', category: 'sauce' },
    { name: 'Américaine', category: 'sauce' },
    { name: 'Look', category: 'sauce' },
    // Drinks
    { name: 'Cola', category: 'drink' },
    { name: 'Cola Zero', category: 'drink' },
    { name: 'Fanta', category: 'drink' },
    { name: 'Water', category: 'drink' },
    { name: 'Jupiler', category: 'drink' },
  ])

  console.log('Done!')
}

seed().catch(console.error)
