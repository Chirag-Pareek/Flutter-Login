-- Normalize all stored emails to canonical form used by the app.
UPDATE "User"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

-- Block migration if normalization reveals duplicates.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY "email"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate emails exist after normalization. Clean duplicates, then re-run migration.';
  END IF;
END $$;

-- Enforce canonical email format at DB layer.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_normalized_chk";
ALTER TABLE "User"
ADD CONSTRAINT "User_email_normalized_chk"
CHECK ("email" = LOWER(BTRIM("email")));

-- Ensure unique index exists (idempotent guard).
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
