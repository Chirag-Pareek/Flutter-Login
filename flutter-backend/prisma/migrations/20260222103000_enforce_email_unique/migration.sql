-- Ensure no duplicate emails exist before enforcing DB-level uniqueness.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY LOWER("email")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate emails exist in "User". Clean duplicates, then re-run migration.';
  END IF;
END $$;

-- Enforce unique email at DB layer.
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
