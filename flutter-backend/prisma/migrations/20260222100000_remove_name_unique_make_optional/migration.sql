-- Allow duplicate names and support users without a name.
DROP INDEX IF EXISTS "User_name_key";
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;
