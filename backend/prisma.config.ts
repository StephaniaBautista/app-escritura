import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { defineConfig } from 'prisma/config'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Run pnpm setup:local or configure backend/.env')
}

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: connectionString,
  },
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString })
    },
  },
})
