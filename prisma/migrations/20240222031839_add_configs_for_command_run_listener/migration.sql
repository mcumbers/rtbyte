-- AlterTable
ALTER TABLE "botGlobalSettings" ADD COLUMN     "global_log_command_execution" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "global_log_command_execution_failure" BOOLEAN NOT NULL DEFAULT true;
