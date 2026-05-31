# Feature Development Workflow

When tasked with creating a new feature or modifying an existing one, follow this systematic approach:

1. **Understand Requirements & Concepts**:
   - Align the feature with the core concepts in `README.md` (e.g., Pipeline 1/2/3, Invisible Filter, Confidence Scoring).
   - Ensure the implementation accommodates dynamic data flows. **Do not hardcode static data**; always fetch and update via Supabase/PostGIS.

2. **Context Gathering & UI Reference (`Analyze First`)**:
   - Always check the `reference/` and `reference desktop UI/` directories for design mockups before writing frontend code. The UI must not be generic; it must closely match the visual references.
   - Find and read the relevant parent components, routes, or backend modules.
   - Look for existing custom hooks, utility functions, or UI components that can be reused (`Modular Code`).

3. **Database Checks (`Verify DB Schemas`)**:
   - Determine what data the new feature requires.
   - Check if the required tables, columns, or relationships exist in Supabase (check `supabase/migrations/` and TS types). Pay attention to `PostGIS` geospatial queries.
   - If the schema is missing required elements, explicitly state: "A database migration is required to support this feature" and ask the user if they want you to create it.

4. **Implementation (`TypeScript First` & `Modular Code`)**:
   - Use strict TypeScript interfaces for all new data structures and component props.
   - Keep React components small and focused. Move business logic (like handling `confidence` scoring or `NMID` deduplication) out of the presentation layer into custom hooks or services.
   - Ensure interactive elements are touch-friendly for the Mobile-First PWA.
   - Never hardcode database queries. Use the Supabase client.

5. **Review & Refine**:
   - Verify that your changes did not break or delete existing features unnecessarily (`No Unnecessary Deletions`).
   - Add clear user feedback for loading states, location capturing, and potential errors (`Error Handling`).
