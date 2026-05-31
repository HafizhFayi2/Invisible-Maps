# Database & Supabase Workflow

When interacting with Supabase, writing queries, or proposing data model changes:

1. **Schema Verification First (`Verify DB Schemas`)**:
   - **NEVER** assume a schema or table structure.
   - Before writing any insert, update, or select query, verify the structure against `supabase/migrations/` or the relevant TypeScript definitions.
   - If a requested feature needs a new column (e.g., `category`), explicitly state that a migration is needed before proceeding.

2. **Query Best Practices (`Supabase Best Practices`)**:
   - Use the Supabase JS/TS client for all database interactions. Do not hardcode raw SQL queries in the frontend or Node scripts unless absolutely necessary for complex admin tasks.
   - Always chain error handling when fetching from Supabase.
   
3. **Robust Error Handling (`Error Handling`)**:
   - Wrap all Supabase client calls in `try-catch` blocks or explicitly handle the returned `{ data, error }` object.
   - Log errors descriptively in scripts, and surface them user-friendly ways in the React frontend.

4. **Migrations**:
   - If writing a new migration file, name it sequentially (e.g., `006_feature_name.sql`).
   - Write idempotent SQL (e.g., `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).
   - Remind the user to run the migration and generate updated TypeScript types using the Supabase CLI.
