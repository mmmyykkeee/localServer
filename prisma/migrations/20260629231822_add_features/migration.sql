-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "followUpAt" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER DEFAULT 0,
ADD COLUMN     "tags" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "opened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tone" TEXT,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "EmailTemplate_name_idx" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_followUpAt_idx" ON "Lead"("followUpAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
