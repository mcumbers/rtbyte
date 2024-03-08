-- AlterTable
ALTER TABLE "memberDataXP" ALTER COLUMN "xp_multiplier" SET DEFAULT 1,
ALTER COLUMN "xp_multiplier" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "modActions" ADD COLUMN     "channel_id" TEXT,
ADD COLUMN     "message_count" INTEGER;
