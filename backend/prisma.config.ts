import { PrismaPg } from '@prisma/adapter-pg'
import { defineConfig } from 'prisma/config'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:4422SwSIDaR1105!@db.mgluvgwpvpuxzjdbnpxw.supabase.co:5432/postgres'

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
