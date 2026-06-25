import path from 'path'
import { defineConfig } from 'prisma/config'

// Next.js loads .env.local automatically; the Prisma CLI does not, so load it
// here. .env is loaded first as a lower-priority base, then .env.local
// overrides it — matching Next.js's own env file precedence.
const { config } = await import('dotenv')
config({ path: path.join(process.cwd(), '.env') })
config({ path: path.join(process.cwd(), '.env.local'), override: true })

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
