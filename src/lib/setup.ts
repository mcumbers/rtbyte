// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { PrismaCache } from '#root/lib/PrismaCache';
import '#utils/Sanitizer/initClean';
import type { BotGlobalSettings, Guild, GuildSettings, GuildSettingsChatFilter, GuildSettingsCommand, GuildSettingsInfoLogs, GuildSettingsModActions, GuildSettingsXP, InteractionProgress, Member, MemberDataXP, ModAction, User, UserSettings } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-logger/register';
import { createColors } from 'colorette';
import { Collection, type Snowflake } from 'discord.js';
import { fieldEncryptionExtension } from 'prisma-field-encryption';
import { inspect } from 'util';

interface RoleUpdate {
	lastUpdated?: number
}
const roleUpdates = new Collection<Snowflake, RoleUpdate>();

const prisma = new PrismaClient()
	.$extends(fieldEncryptionExtension());

const prismaCache = {
	botGlobalSettings: new PrismaCache<BotGlobalSettings>(prisma.botGlobalSettings),
	user: new PrismaCache<User>(prisma.user),
	guild: new PrismaCache<Guild>(prisma.guild),
	member: new PrismaCache<Member>(prisma.member),
	userSettings: new PrismaCache<UserSettings>(prisma.userSettings),
	guildSettings: new PrismaCache<GuildSettings>(prisma.guildSettings),
	guildSettingsCommand: new PrismaCache<GuildSettingsCommand>(prisma.guildSettingsCommand),
	guildSettingsChatFilter: new PrismaCache<GuildSettingsChatFilter>(prisma.guildSettingsChatFilter),
	guildSettingsInfoLogs: new PrismaCache<GuildSettingsInfoLogs>(prisma.guildSettingsInfoLogs),
	guildSettingsModActions: new PrismaCache<GuildSettingsModActions>(prisma.guildSettingsModActions),
	modAction: new PrismaCache<ModAction>(prisma.modAction),
	guildSettingsXP: new PrismaCache<GuildSettingsXP>(prisma.guildSettingsXP),
	memberDataXP: new PrismaCache<MemberDataXP>(prisma.memberDataXP),
	interactionProgress: new PrismaCache<InteractionProgress>(prisma.interactionProgress)
};

inspect.defaultOptions.depth = 1;
createColors({ useColor: true });
container.prisma = prisma;
container.prismaCache = prismaCache;
container.roleUpdates = roleUpdates;

declare module '@sapphire/pieces' {
	interface Container {
		prisma: typeof prisma;
		prismaCache: typeof prismaCache;
		roleUpdates: typeof roleUpdates;
	}
}
