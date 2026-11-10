-- Keep DB-backed write protection indexed as portal traffic grows.
CREATE INDEX "Task_requesterId_createdAt_idx" ON "Task"("requesterId", "createdAt");
CREATE INDEX "ChatGroup_createdById_createdAt_idx" ON "ChatGroup"("createdById", "createdAt");
