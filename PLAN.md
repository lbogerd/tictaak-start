# Migration Plan: Prisma to Drizzle ORM

## Current State Analysis

### Database Schema
- **Database**: PostgreSQL
- **Tables**: 
  - `Category` (id, name, createdAt, updatedAt, archivedAt)
  - `Task` (id, title, categoryId, createdAt, lastPrintedAt, nextPrintDate, recursOnDays, archivedAt)
- **Relationships**: Task belongs to Category (foreign key)

### Current Prisma Setup
- Client generated to `../prisma/client`
- Database URL from environment variable
- Seed script configured
- Used in: `src/lib/db.ts`, `src/lib/services/task.service.ts`, seed files

## Migration Steps

### Phase 1: Setup Drizzle ORM
1. **Install Dependencies**
   ```bash
   pnpm add drizzle-orm pg
   pnpm add -D drizzle-kit @types/pg
   ```

2. **Remove Prisma Dependencies**
   ```bash
   pnpm remove @prisma/client prisma
   ```

3. **Create Drizzle Configuration**
   - Create `drizzle.config.ts` in project root
   - Configure PostgreSQL connection and schema paths

### Phase 2: Schema Migration
4. **Create Drizzle Schema**
   - Create `src/lib/schema.ts`
   - Define Category and Task models with relationships
   - Map Prisma types to Drizzle equivalents

5. **Update Database Connection**
   - Replace `src/lib/db.ts` with Drizzle client
   - Configure PostgreSQL connection pool

### Phase 3: Service Layer Migration
6. **Update Task Service**
   - Replace Prisma queries with Drizzle syntax in `src/lib/services/task.service.ts`
   - Update type imports and query methods
   - Maintain same function signatures for compatibility

7. **Update Route Handlers**
   - Review and update any server functions using database
   - Check `src/routes/index.tsx` and other route files

### Phase 4: Seed Data & Scripts Migration
8. **Update Seed Data Scripts**
   - Update seed data scripts (`prisma/seed-data.ts` → `src/lib/seed.ts`)
   - Convert Prisma seed operations to Drizzle syntax

9. **Update Package.json Scripts**
   - Replace Prisma commands with Drizzle equivalents:
     - `db:gen` → drizzle-kit generate
     - `db:reset` → `db:push` and seed
     - Update build script to remove Drizzle generation (not needed)
   - Update test script to remove Prisma database setup/teardown

### Phase 5: PGlite Test Integration
10. **Install PGlite for Testing**
    ```bash
    pnpm add -D @electric-sql/pglite
    ```
    - PGlite provides in-memory PostgreSQL for tests (2.6mb gzipped)
    - No external PostgreSQL instance needed for testing

11. **Create Test Database Setup**
    - Create `src/lib/test-db.ts` with PGlite configuration:
      ```typescript
      import { PGlite } from '@electric-sql/pglite'
      import { drizzle } from 'drizzle-orm/pglite'
      import * as schema from './schema'
      
      export function createTestDb() {
        const client = new PGlite() // In-memory Postgres
        return drizzle({ client, schema })
      }
      ```

12. **Update Test Infrastructure**
    - Create test utilities for database setup/teardown using PGlite
    - Implement beforeEach/afterEach hooks for test isolation
    - Update existing tests to use PGlite instead of external PostgreSQL
    - Configure Vitest to use PGlite for all database tests

### Phase 6: Cleanup & Optimization
13. **Remove Prisma Files**
    - Delete `prisma/` directory
    - Remove Prisma configuration from package.json
    - Clean up any remaining Prisma imports

14. **Documentation & Final Testing**
    - Update CLAUDE.md with new database patterns
    - Run full test suite with PGlite
    - Verify all functionality works as expected

## Key Considerations

### Breaking Changes
- Query syntax changes from Prisma to Drizzle
- Type generation location changes
- Different transaction handling patterns

### Migration Strategy
- **Recommended**: Feature branch migration with comprehensive testing
- **Database**: No schema changes needed - same PostgreSQL structure
- **Rollback Plan**: Keep Prisma setup in separate branch until migration verified

### Benefits After Migration
- Better TypeScript performance (no code generation step)
- More explicit SQL-like queries
- Smaller bundle size
- Better tree-shaking support
- More granular query control

## Risk Assessment
- **Low**: Schema is simple with only 2 tables
- **Medium**: Need to verify all query patterns work correctly
- **Low**: Good test coverage exists to validate migration