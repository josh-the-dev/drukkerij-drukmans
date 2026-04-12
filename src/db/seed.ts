import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set')

const db = drizzle(databaseUrl, { schema })

async function seed() {
  console.log('Clearing existing data...')
  await db.delete(schema.orderItemOptions)
  await db.delete(schema.orderItems)
  await db.delete(schema.orders)
  await db.delete(schema.sessions)
  await db.delete(schema.pairs)
  await db.delete(schema.menuItemOptions)
  await db.delete(schema.menuOptions)
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

  const insertedMenuItems = await db.insert(schema.menuItems).values([
    // Frietjes
    { name: 'Frietjes mini-mini', category: 'frietjes' },
    { name: 'Frietjes mini', category: 'frietjes' },
    { name: 'Frietjes klein', category: 'frietjes' },
    { name: 'Frietjes groot', category: 'frietjes' },
    // Snacks
    { name: 'Adreense saté', category: 'snack' },
    { name: 'Bami', category: 'snack' },
    { name: 'Berenpoot met kruiden', category: 'snack' },
    { name: 'Bicky', category: 'snack' },
    { name: 'Bicky cheese', category: 'snack' },
    { name: 'Bitterballen', category: 'snack' },
    { name: 'Cervela', category: 'snack' },
    { name: 'Cervela ketchup/mayo/ketchup', category: 'snack' },
    { name: 'Cervela special', category: 'snack' },
    { name: 'Chickenfingers', category: 'snack' },
    { name: 'Curryworst', category: 'snack' },
    { name: 'Curryworst special', category: 'snack' },
    { name: 'Garnaalkroket', category: 'snack' },
    { name: 'Goulashkroket', category: 'snack' },
    { name: 'Kaaskroket (gewoon)', category: 'snack' },
    { name: 'Kaaskroket (huisgemaakt)', category: 'snack' },
    { name: 'Kinderbox', category: 'snack' },
    { name: 'Kipcorn', category: 'snack' },
    { name: 'Kipkaaspunt', category: 'snack' },
    { name: 'Kippenboutjes', category: 'snack' },
    { name: 'Kippets', category: 'snack' },
    { name: 'Kipstokjes', category: 'snack' },
    { name: 'Koude schotel met hesp', category: 'snack' },
    { name: 'Koude schotel met kip', category: 'snack' },
    { name: 'Koude schotel natuur', category: 'snack' },
    { name: 'Loempia + warme curry', category: 'snack' },
    { name: 'Lucifer', category: 'snack' },
    { name: 'Mexicano', category: 'snack' },
    { name: 'Oriental bami schijf', category: 'snack' },
    { name: 'Rauwe cervela', category: 'snack' },
    { name: 'Saté', category: 'snack' },
    { name: 'Sitostick', category: 'snack' },
    { name: 'Vis stick', category: 'snack' },
    { name: 'Vleeskroket', category: 'snack' },
    { name: 'Wrap', category: 'snack' },
    // Sauces
    { name: 'Americain', category: 'sauce' },
    { name: 'Andalouse', category: 'sauce' },
    { name: 'Curry', category: 'sauce' },
    { name: 'Goulash', category: 'sauce' },
    { name: 'Ketchup', category: 'sauce' },
    { name: 'Mammoetsaus', category: 'sauce' },
    { name: 'Mayonaise', category: 'sauce' },
    { name: 'Pindsaus', category: 'sauce' },
    { name: 'Stoofvlees', category: 'sauce' },
    { name: 'Stoofvleessaus', category: 'sauce' },
    { name: 'Tartaar', category: 'sauce' },
    { name: 'Tartaar (huisgemaakt)', category: 'sauce' },
    // Drinks
    { name: 'Cola', category: 'drink' },
    { name: 'Cola Zero', category: 'drink' },
    { name: 'Fanta', category: 'drink' },
    { name: 'Water', category: 'drink' },
    { name: 'Jupiler', category: 'drink' },
  ]).returning()

  console.log('Seeding menu options...')

  const insertedOptions = await db
    .insert(schema.menuOptions)
    .values([
      { label: 'Licht gebakken' },
      { label: 'Zonder ui' },
      { label: 'Groot potje' },
    ])
    .returning()

  const optByLabel = Object.fromEntries(insertedOptions.map((o) => [o.label, o]))

  const burgers = new Set(['Bicky', 'Bicky cheese', 'Wrap'])
  const koudeSchotels = new Set([
    'Koude schotel met hesp',
    'Koude schotel met kip',
    'Koude schotel natuur',
  ])

  const menuItemOptionsValues = insertedMenuItems.flatMap((item) => {
    if (item.category === 'frietjes') {
      return [{ menuItemId: item.id, menuOptionId: optByLabel['Licht gebakken'].id }]
    }
    if (item.category === 'snack') {
      if (burgers.has(item.name)) {
        return [{ menuItemId: item.id, menuOptionId: optByLabel['Zonder ui'].id }]
      }
      if (koudeSchotels.has(item.name)) {
        return []
      }
      return [{ menuItemId: item.id, menuOptionId: optByLabel['Licht gebakken'].id }]
    }
    if (item.category === 'sauce') {
      return [{ menuItemId: item.id, menuOptionId: optByLabel['Groot potje'].id }]
    }
    return []
  })

  await db.insert(schema.menuItemOptions).values(menuItemOptionsValues)

  console.log('Done!')
}

seed().catch(console.error)
