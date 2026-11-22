import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/db/schema.ts', './src/drizzle/relations.ts'],
  out: './src/drizzle',
  casing: 'snake_case',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
