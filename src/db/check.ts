import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set')

const db = drizzle(databaseUrl, { schema })

const people = await db.select().from(schema.people)
const sessions = await db.select().from(schema.sessions)
const orders = await db.select().from(schema.orders)

console.log('People:', people.map((p) => `${p.id}:${p.name}`).join(', '))
console.log('Sessions:', sessions.map((s) => `${s.id}:${s.status}`).join(', '))
console.log('Orders:', orders.map((o) => `session=${o.sessionId} person=${o.personId} submitted=${o.submittedAt ? 'yes' : 'no'}`).join(', '))
