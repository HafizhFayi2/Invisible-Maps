# Debugging Workflow

When the user reports an error or a bug, follow these procedural steps:

1. **Analyze the Error (`Analyze First`)**:
   - Ask for or review the error logs/stack traces.
   - Identify the domain: UI (React/Vite), Backend/Auth (Supabase), Map (Leaflet), or Script (Python/TS).

2. **Locate the Source**:
   - Search the codebase to find the relevant component, function, or query.
   - Read the entire file and its direct dependencies to understand the context.

3. **Verify Dependencies & Schema (`Verify DB Schemas`)**:
   - If it's a data issue or a Supabase error, verify the Supabase schema using Supabase client types or by checking migration files in `supabase/migrations/`.
   - Ensure the TypeScript interfaces match the actual DB schema.

4. **Propose and Implement a Fix**:
   - Briefly explain the root cause to the user.
   - Provide the corrected code.
   - **Critical**: Ensure the fix includes robust error handling (e.g., `try-catch` blocks).
   - **Critical**: Do not delete unrelated code, features, or comments (`No Unnecessary Deletions`).

5. **Validation & Logging (`Test & Validate`)**:
   - For UI fixes, ensure responsive design isn't broken.
   - For backend/scraper fixes, ensure the script outputs descriptive logs to confirm the fix works.
