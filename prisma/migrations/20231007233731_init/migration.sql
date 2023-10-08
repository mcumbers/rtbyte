-- CreateEnum
CREATE TYPE "MeasurementSystem" AS ENUM ('IMPERIAL', 'METRIC');

-- CreateEnum
CREATE TYPE "LanguageTag" AS ENUM ('bg_BG', 'cs_CZ', 'da_DK', 'de_DE', 'el_GR', 'en_GB', 'en_US', 'fi_FI', 'fr_FR', 'hi_IN', 'hr_HR', 'hu_HU', 'it_IT', 'ja_JP', 'ko_KR', 'lt_LT', 'nb_NO', 'nl_NL', 'pl_PL', 'pt_BR', 'ro_RO', 'ru_RU', 'sv_SE', 'th_TH', 'tr_TR', 'uk_UA', 'vi_VN', 'zh_CN');

-- CreateEnum
CREATE TYPE "ModActionType" AS ENUM ('BAN', 'UNBAN', 'KICK', 'MUTE', 'UNMUTE', 'PURGE', 'VCBAN', 'VCUNBAN', 'VCKICK', 'FILTER_ANTI_INVITE', 'FILTER_MENTION_SPAM', 'FILTER_CHAT', 'FILTER_USERNAME');

-- CreateTable
CREATE TABLE "clientSettings" (
    "client_id" TEXT NOT NULL,
    "user_blacklist" TEXT[],
    "guild_blacklist" TEXT[],
    "bot_restarts" TIMESTAMP(3)[],

    CONSTRAINT "clientSettings_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "guild_id" TEXT NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "join_times" TIMESTAMP(3)[],
    "leave_times" TIMESTAMP(3)[],
    "username_history" TEXT[],
    "display_name_history" TEXT[],

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userSettings" (
    "user_id" TEXT NOT NULL,
    "language" "LanguageTag",
    "measurement_units" "MeasurementSystem",
    "bot_disabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "userSettings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "guildSettings" (
    "guild_id" TEXT NOT NULL,
    "language" "LanguageTag" NOT NULL DEFAULT 'en_US',
    "measurement_units" "MeasurementSystem" NOT NULL DEFAULT 'IMPERIAL',
    "analytics_guild_info_detailed" BOOLEAN NOT NULL DEFAULT true,
    "analytics_guild_command_use" BOOLEAN NOT NULL DEFAULT true,
    "analytics_guild_command_use_detailed" BOOLEAN NOT NULL DEFAULT true,
    "analytics_guild_bans" BOOLEAN NOT NULL DEFAULT false,
    "analytics_guild_bans_detailed" BOOLEAN NOT NULL DEFAULT false,
    "analytics_guild_moderation" BOOLEAN NOT NULL DEFAULT false,
    "analytics_guild_moderation_detailed" BOOLEAN NOT NULL DEFAULT false,
    "greeting_welcome_users" BOOLEAN NOT NULL DEFAULT false,
    "greeting_welcome_channel" TEXT,
    "greeting_welcome_message" TEXT,
    "greeting_dismiss_users" BOOLEAN NOT NULL DEFAULT false,
    "greeting_dismiss_channel" TEXT,
    "greeting_dismiss_message" TEXT,

    CONSTRAINT "guildSettings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guildCommandSettings" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "command_name" TEXT NOT NULL,
    "command_enabled" BOOLEAN NOT NULL,
    "slash_command_enabled" BOOLEAN NOT NULL,
    "context_command_enabled" BOOLEAN NOT NULL,
    "channel_whitelist_enabled" BOOLEAN NOT NULL,
    "channel_whitelist" TEXT[],
    "channel_blacklist_enabled" BOOLEAN NOT NULL,
    "channel_blacklist" TEXT[],
    "member_whitelist_enabled" BOOLEAN NOT NULL,
    "member_whitelist" TEXT[],
    "member_blacklist_enabled" BOOLEAN NOT NULL,
    "member_blacklist" TEXT[],
    "role_whitelist_enabled" BOOLEAN NOT NULL,
    "role_whitelist" TEXT[],
    "role_blacklist_enabled" BOOLEAN NOT NULL,
    "role_blacklist" TEXT[],
    "other" JSONB,

    CONSTRAINT "guildCommandSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guildChatFilterSettings" (
    "guild_id" TEXT NOT NULL,
    "filters_anti_invite" BOOLEAN NOT NULL DEFAULT false,
    "filters_anti_invite_punishment" TEXT,
    "filters_mod_bypass" BOOLEAN NOT NULL DEFAULT true,
    "filters_delete_offending" BOOLEAN NOT NULL DEFAULT true,
    "filters_check_display_names" BOOLEAN NOT NULL DEFAULT true,
    "filters_word_blacklist" TEXT[],
    "filters_invite_whitelist" TEXT[],
    "filters_mention_spam_threshold" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "guildChatFilterSettings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guildSettingsInfoLogs" (
    "guild_id" TEXT NOT NULL,
    "log_channel_info" TEXT,
    "log_channel_create" BOOLEAN NOT NULL DEFAULT false,
    "log_channel_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_channel_update" BOOLEAN NOT NULL DEFAULT false,
    "log_emoji_create" BOOLEAN NOT NULL DEFAULT false,
    "log_emoji_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_emoji_update" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_bot_add" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_member_join" BOOLEAN NOT NULL DEFAULT true,
    "log_guild_member_leave" BOOLEAN NOT NULL DEFAULT true,
    "log_guild_member_update" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_update" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_scheduled_event_create" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_scheduled_event_update" BOOLEAN NOT NULL DEFAULT false,
    "log_guild_scheduled_event_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_invite_create" BOOLEAN NOT NULL DEFAULT false,
    "log_invite_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_message_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_message_update" BOOLEAN NOT NULL DEFAULT false,
    "log_role_create" BOOLEAN NOT NULL DEFAULT false,
    "log_role_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_role_update" BOOLEAN NOT NULL DEFAULT false,
    "log_stage_instance_create" BOOLEAN NOT NULL DEFAULT false,
    "log_stage_instance_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_stage_instance_update" BOOLEAN NOT NULL DEFAULT false,
    "log_sticker_create" BOOLEAN NOT NULL DEFAULT false,
    "log_sticker_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_sticker_update" BOOLEAN NOT NULL DEFAULT false,
    "log_thread_create" BOOLEAN NOT NULL DEFAULT false,
    "log_thread_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_thread_update" BOOLEAN NOT NULL DEFAULT false,
    "log_webhook_create" BOOLEAN NOT NULL DEFAULT false,
    "log_webhook_delete" BOOLEAN NOT NULL DEFAULT false,
    "log_webhook_update" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "guildSettingsInfoLogs_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guildModActionSettings" (
    "guild_id" TEXT NOT NULL,
    "log_channel_moderation" TEXT,
    "log_channel_moderation_public" TEXT,
    "ban_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "ban_log" BOOLEAN NOT NULL DEFAULT true,
    "ban_log_public" BOOLEAN NOT NULL DEFAULT false,
    "ban_allow_appeal" BOOLEAN NOT NULL DEFAULT true,
    "ban_purge_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ban_purge_seconds" INTEGER NOT NULL DEFAULT 86400,
    "unban_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "unban_log" BOOLEAN NOT NULL DEFAULT true,
    "unban_log_public" BOOLEAN NOT NULL DEFAULT false,
    "kick_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "kick_log" BOOLEAN NOT NULL DEFAULT true,
    "kick_log_public" BOOLEAN NOT NULL DEFAULT false,
    "kick_purge_enabled" BOOLEAN NOT NULL DEFAULT true,
    "kick_purge_seconds" INTEGER NOT NULL DEFAULT 86400,
    "mute_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "mute_log" BOOLEAN NOT NULL DEFAULT true,
    "mute_log_public" BOOLEAN NOT NULL DEFAULT false,
    "mute_allow_appeal" BOOLEAN NOT NULL DEFAULT true,
    "mute_purge_enabled" BOOLEAN NOT NULL DEFAULT true,
    "mute_purge_seconds" INTEGER NOT NULL DEFAULT 86400,
    "unmute_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "unmute_log" BOOLEAN NOT NULL DEFAULT true,
    "unmute_log_public" BOOLEAN NOT NULL DEFAULT false,
    "purge_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "purge_log" BOOLEAN NOT NULL DEFAULT true,
    "purge_log_public" BOOLEAN NOT NULL DEFAULT false,
    "vcban_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "vcban_log" BOOLEAN NOT NULL DEFAULT true,
    "vcban_log_public" BOOLEAN NOT NULL DEFAULT false,
    "vcban_allow_appeal" BOOLEAN NOT NULL DEFAULT true,
    "vcunban_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "vcunban_log" BOOLEAN NOT NULL DEFAULT true,
    "vcunban_log_public" BOOLEAN NOT NULL DEFAULT false,
    "vckick_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "vckick_log" BOOLEAN NOT NULL DEFAULT true,
    "vckick_log_public" BOOLEAN NOT NULL DEFAULT false,
    "anti_invite_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "anti_invite_log" BOOLEAN NOT NULL DEFAULT true,
    "anti_invite_log_public" BOOLEAN NOT NULL DEFAULT false,
    "anti_invite_delete" BOOLEAN NOT NULL DEFAULT true,
    "anti_invite_ban_user" BOOLEAN NOT NULL DEFAULT false,
    "anti_invite_kick_user" BOOLEAN NOT NULL DEFAULT false,
    "anti_invite_mute_user" BOOLEAN NOT NULL DEFAULT false,
    "anti_invite_mute_user_duration" INTEGER,
    "mention_spam_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "mention_spam_log" BOOLEAN NOT NULL DEFAULT true,
    "mention_spam_log_public" BOOLEAN NOT NULL DEFAULT false,
    "mention_spam_delete" BOOLEAN NOT NULL DEFAULT true,
    "mention_spam_ban_user" BOOLEAN NOT NULL DEFAULT false,
    "mention_spam_kick_user" BOOLEAN NOT NULL DEFAULT false,
    "mention_spam_mute_user" BOOLEAN NOT NULL DEFAULT false,
    "mention_spam_mute_user_duration" INTEGER,
    "filtered_word_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "filtered_word_log" BOOLEAN NOT NULL DEFAULT true,
    "filtered_word_log_public" BOOLEAN NOT NULL DEFAULT false,
    "filtered_word_delete" BOOLEAN NOT NULL DEFAULT true,
    "filtered_word_ban_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_word_kick_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_word_mute_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_word_mute_user_duration" INTEGER,
    "filtered_name_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "filtered_name_log" BOOLEAN NOT NULL DEFAULT true,
    "filtered_name_log_public" BOOLEAN NOT NULL DEFAULT false,
    "filtered_name_overwrite" BOOLEAN NOT NULL DEFAULT true,
    "filtered_name_overwrite_options" TEXT[] DEFAULT ARRAY['Redacted']::TEXT[],
    "filtered_name_ban_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_name_kick_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_name_mute_user" BOOLEAN NOT NULL DEFAULT false,
    "filtered_name_mute_user_duration" INTEGER,
    "warn_notify_user" BOOLEAN NOT NULL DEFAULT true,
    "warn_log" BOOLEAN NOT NULL DEFAULT true,
    "warn_log_public" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "guildModActionSettings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "modActions" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "action_type" "ModActionType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER,
    "silent" BOOLEAN DEFAULT false,

    CONSTRAINT "modActions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSettings" ADD CONSTRAINT "userSettings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildSettings" ADD CONSTRAINT "guildSettings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildCommandSettings" ADD CONSTRAINT "guildCommandSettings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guildSettings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildChatFilterSettings" ADD CONSTRAINT "guildChatFilterSettings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guildSettings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildSettingsInfoLogs" ADD CONSTRAINT "guildSettingsInfoLogs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guildSettings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildModActionSettings" ADD CONSTRAINT "guildModActionSettings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guildSettings"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modActions" ADD CONSTRAINT "modActions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;
