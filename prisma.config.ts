import path from 'path'
import { defineConfig } from 'prisma/config'

// Load .env for Prisma CLI (Next.js loads .env.local automatically, CLI does not)
const { config } = await import('dotenv')
config({ path: path.join(process.cwd(), '.env') })

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
