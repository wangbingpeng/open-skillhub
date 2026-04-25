-- AlterTable: 移除 DocumentChunk 的 embedding 字段（向量数据已迁移到 Chroma）
-- SQLite 不支持 DROP COLUMN，需要重建表

-- 1. 创建新表（不含 embedding 列）
CREATE TABLE "DocumentChunk_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "documentId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. 迁移数据（不含 embedding）
INSERT INTO "DocumentChunk_new" ("id", "content", "chunkIndex", "documentId", "metadata", "createdAt")
SELECT "id", "content", "chunkIndex", "documentId", "metadata", "createdAt" FROM "DocumentChunk";

-- 3. 删除旧表
DROP TABLE "DocumentChunk";

-- 4. 重命名新表
ALTER TABLE "DocumentChunk_new" RENAME TO "DocumentChunk";
