/*
  Warnings:

  - You are about to drop the column `description` on the `modActions` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `modActions` table. All the data in the column will be lost.
  - You are about to drop the column `moderator_id` on the `modActions` table. All the data in the column will be lost.
  - You are about to drop the column `silent` on the `modActions` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `modActions` table. All the data in the column will be lost.
  - Added the required column `created_time` to the `modActions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "guildSettingsInfoLogs" ADD COLUMN     "log_ignored_executor_ids" TEXT[];

-- AlterTable
ALTER TABLE "modActions" DROP COLUMN "description",
DROP COLUMN "duration_minutes",
DROP COLUMN "moderator_id",
DROP COLUMN "silent",
DROP COLUMN "timestamp",
ADD COLUMN     "audit_log_id" TEXT,
ADD COLUMN     "created_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "details" TEXT,
ADD COLUMN     "effective_until" TIMESTAMP(3),
ADD COLUMN     "executor_id" TEXT,
ADD COLUMN     "reason" TEXT,
ALTER COLUMN "target_id" DROP NOT NULL;
