-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tone" TEXT,
    "purpose" TEXT,
    "model" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDraft_leadId_idx" ON "EmailDraft"("leadId");

-- CreateIndex
CREATE INDEX "EmailDraft_used_idx" ON "EmailDraft"("used");

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
