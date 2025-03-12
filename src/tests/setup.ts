// src/tests/vitest.setup.ts
import * as dotenv from 'dotenv';
const result = dotenv.config({ path: '.env.test' });

if (result.error) {
  console.error("Error loading .env.test:", result.error);
  throw result.error;
}

console.log("Loaded .env.test:", result.parsed);

// *** LIGNE IMPORTANTE : Forcer l'affectation à process.env ***
Object.assign(process.env, result.parsed); // <--- CETTE LIGNE

console.log("process.env.SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("process.env.SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);