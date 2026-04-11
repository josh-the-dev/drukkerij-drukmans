import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const db = drizzle(process.env.DATABASE_URL!, { schema })

async function seed() {
  console.log('Clearing existing data...')
  await db.delete(schema.pairs)
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

  console.log('Done!')
}

seed().catch(console.error)
