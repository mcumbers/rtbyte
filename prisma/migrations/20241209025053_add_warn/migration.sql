/*
  Warnings:

  - You are about to drop the column `warn_notify_user` on the `guildModActionSettings` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ModActionType" ADD VALUE 'WARN';

-- AlterTable
ALTER TABLE "guildModActionSettings" DROP COLUMN "warn_notify_user",
ADD COLUMN     "anti_invite_warn_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "filtered_name_warn_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "filtered_word_warn_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mention_spam_warn_user" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "modActions" ADD COLUMN     "anonymous" BOOLEAN;
