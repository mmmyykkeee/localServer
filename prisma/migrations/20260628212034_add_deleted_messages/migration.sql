-- CreateTable
CREATE TABLE "DeletedMessage" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedMessage_messageId_idx" ON "DeletedMessage"("messageId");
