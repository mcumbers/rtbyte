/*
  Warnings:

  - The values [FILTER_ANTI_INVITE,FILTER_MENTION_SPAM,FILTER_USERNAME] on the enum `ModActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ModActionType_new" AS ENUM ('BAN', 'UNBAN', 'KICK', 'MUTE', 'UNMUTE', 'PURGE', 'VCBAN', 'VCUNBAN', 'VCKICK', 'FILTER_CHAT', 'FILTER_NAME', 'FLAG_SPAMMER_ADD', 'FLAG_SPAMMER_REMOVE', 'FLAG_QUARANTINE_ADD', 'FLAG_QUARANTINE_REMOVE');
ALTER TABLE "modActions" ALTER COLUMN "action_type" TYPE "ModActionType_new" USING ("action_type"::text::"ModActionType_new");
ALTER TYPE "ModActionType" RENAME TO "ModActionType_old";
ALTER TYPE "ModActionType_new" RENAME TO "ModActionType";
DROP TYPE "ModActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "guildModActionSettings" ADD COLUMN     "flag_quarantine_add_log" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "flag_quarantine_add_log_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_quarantine_add_notify_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_quarantine_remove_log" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "flag_quarantine_remove_log_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_quarantine_remove_notify_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_spammer_add_log" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "flag_spammer_add_log_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_spammer_add_notify_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_spammer_remove_log" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "flag_spammer_remove_log_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flag_spammer_remove_notify_user" BOOLEAN NOT NULL DEFAULT false;
