-- Additive migration: existing users and client ownership remain unchanged.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERVISOR';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;

CREATE INDEX IF NOT EXISTS "users_tenantId_supervisorId_idx"
  ON "users"("tenantId", "supervisorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_supervisorId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_supervisorId_fkey"
      FOREIGN KEY ("supervisorId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
