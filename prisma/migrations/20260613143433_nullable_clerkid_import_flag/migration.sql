-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isImported" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clerkId" DROP NOT NULL;
