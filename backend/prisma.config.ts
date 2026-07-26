import { PrismaPg } from '@prisma/adapter-pg'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    },
  },
})
