/*
  Warnings:

  - Added the required column `uploaderId` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("content", "createdAt", "error", "filename", "id", "knowledgeBaseId", "mimeType", "originalName", "size", "status", "updatedAt", "uploaderId") SELECT d."content", d."createdAt", d."error", d."filename", d."id", d."knowledgeBaseId", d."mimeType", d."originalName", d."size", d."status", d."updatedAt", kb."authorId" FROM "Document" d JOIN "KnowledgeBase" kb ON d."knowledgeBaseId" = kb."id";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_uploaderId_idx" ON "Document"("uploaderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
