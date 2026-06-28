-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "response" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'new';

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
