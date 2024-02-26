-- CreateEnum
CREATE TYPE "MultiplierBehaviour" AS ENUM ('HIGHEST', 'STACK', 'COMPOUND');

-- AlterTable
ALTER TABLE "guildSettingsXP" ADD COLUMN     "channel_multipliers" JSONB,
ADD COLUMN     "role_multipliers" JSONB,
ADD COLUMN     "xp_multiplier_behaviour" "MultiplierBehaviour" NOT NULL DEFAULT 'STACK';
