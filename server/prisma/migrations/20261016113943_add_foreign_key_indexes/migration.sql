-- CreateIndex
CREATE INDEX "AiChat_userId_idx" ON "AiChat"("userId");

-- CreateIndex
CREATE INDEX "AiChat_tapestryId_idx" ON "AiChat"("tapestryId");

-- CreateIndex
CREATE INDEX "AiChatMessage_chatId_idx" ON "AiChatMessage"("chatId");

-- CreateIndex
CREATE INDEX "AiChatMessageAttachment_messageId_idx" ON "AiChatMessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "AiChatMessageAttachment_itemId_idx" ON "AiChatMessageAttachment"("itemId");

-- CreateIndex
CREATE INDEX "Comment_tapestryId_idx" ON "Comment"("tapestryId");

-- CreateIndex
CREATE INDEX "Comment_itemId_idx" ON "Comment"("itemId");

-- CreateIndex
CREATE INDEX "Comment_relId_idx" ON "Comment"("relId");

-- CreateIndex
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");

-- CreateIndex
CREATE INDEX "Group_tapestryId_idx" ON "Group"("tapestryId");

-- CreateIndex
CREATE INDEX "ImageAssetRendition_assetId_idx" ON "ImageAssetRendition"("assetId");

-- CreateIndex
CREATE INDEX "Item_tapestryId_idx" ON "Item"("tapestryId");

-- CreateIndex
CREATE INDEX "Item_thumbnailId_idx" ON "Item"("thumbnailId");

-- CreateIndex
CREATE INDEX "Item_groupId_idx" ON "Item"("groupId");

-- CreateIndex
CREATE INDEX "PresentationStep_itemId_idx" ON "PresentationStep"("itemId");

-- CreateIndex
CREATE INDEX "PresentationStep_groupId_idx" ON "PresentationStep"("groupId");

-- CreateIndex
CREATE INDEX "PresentationStep_prevStepId_idx" ON "PresentationStep"("prevStepId");

-- CreateIndex
CREATE INDEX "Rel_tapestryId_idx" ON "Rel"("tapestryId");

-- CreateIndex
CREATE INDEX "Rel_fromItemId_idx" ON "Rel"("fromItemId");

-- CreateIndex
CREATE INDEX "Rel_toItemId_idx" ON "Rel"("toItemId");

-- CreateIndex
CREATE INDEX "TapestryAccess_tapestryId_idx" ON "TapestryAccess"("tapestryId");

-- CreateIndex
CREATE INDEX "TapestryInvitation_tapestryId_idx" ON "TapestryInvitation"("tapestryId");

-- CreateIndex
CREATE INDEX "UserSecret_ownerId_idx" ON "UserSecret"("ownerId");
