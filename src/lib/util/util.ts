import { container } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { ChannelType, GuildChannel, Invite, PermissionFlagsBits, type ApplicationCommandPermissions, type AuditLogEvent, type Emoji, type Guild, type GuildScheduledEvent, type Interaction, type Message, type Role, type StageChannel, type StageInstance, type Sticker, type ThreadChannel, type User, type VoiceChannel, type Webhook } from "discord.js";

/**
 * Get the executor user from the last audit log entry of specific type
 * @param action The audit log type to fetch
 * @param guild The Guild object to get audit logs for
 * @returns Executor User object from the last audit log entry of specific type.
 */
export async function getAuditLogExecutor(action: AuditLogEvent, guild: Guild, target?: Guild | GuildChannel | User | Role | Invite | Webhook | Emoji | Message | Interaction | StageInstance | Sticker | ThreadChannel | GuildScheduledEvent | ApplicationCommandPermissions) {
	// TODO: Make target required--once I've fixed all the other logs
	if (isNullishOrEmpty(target)) return null;
	if (!guild.members.cache.get(container.client.user!.id)?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

	const auditLogEntries = await guild.fetchAuditLogs({ type: action });

	// Pesky Invites don't have IDs
	if (target instanceof Invite) {
		const handleTarget = target as Invite;
		const targetAuditLotEntry = auditLogEntries.entries.find((entry: any) => entry.target?.code && entry.target.code === handleTarget.code);
		const executor = targetAuditLotEntry?.executor;
		return executor || null;
	}

	// Casting target to any as all possible target types except Invite can be compared like this
	const handleTarget = target as any;
	const targetAuditLotEntry = auditLogEntries.entries.find((entry: any) => entry.target?.id && entry.target.id === handleTarget.id);
	const executor = targetAuditLotEntry?.executor;
	return executor || null;
}

export async function getAuditLogEntry(action: AuditLogEvent, guild: Guild, target?: Guild | GuildChannel | User | Role | Invite | Webhook | Emoji | Message | Interaction | StageInstance | Sticker | ThreadChannel | GuildScheduledEvent | ApplicationCommandPermissions) {
	// TODO: Make target required--once I've fixed all the other logs
	if (isNullishOrEmpty(target)) return null;
	if (!guild.members.cache.get(container.client.user!.id)?.permissions.has(PermissionFlagsBits.ViewAuditLog)) return null;

	const auditLogEntries = await guild.fetchAuditLogs({ type: action });

	// Pesky Invites don't have IDs
	if (target instanceof Invite) {
		const handleTarget = target as Invite;
		const targetAuditLotEntry = auditLogEntries.entries.find((entry: any) => entry.target?.code && entry.target.code === handleTarget.code);
		return targetAuditLotEntry || null;
	}

	// Casting target to any as all possible target types except Invite can be compared like this
	const handleTarget = target as any;
	const targetAuditLotEntry = auditLogEntries.entries.find((entry: any) => entry.target?.id && entry.target.id === handleTarget.id);
	return targetAuditLotEntry || null;
}

/**
 * Get the content from a message.
 * @param message The Message instance to get the content from
 */
export function getContent(message: Message): string | null {
	if (message.content) return message.content;
	for (const embed of message.embeds) {
		if (embed.description) return embed.description;
		if (embed.fields.length) return embed.fields[0].value;
	}
	return null;
}

/**
 * Get the content from a message.
 * @param channel The Stage or Voice channel to get the region override from
 */
export function getRegionOverride(channel: StageChannel | VoiceChannel) {
	switch (channel.rtcRegion) {
		case 'brazil':
			return `🇧🇷 ${`Brazil`}`
		case 'hongkong':
			return `🇭🇰 ${`Hong Kong`}`
		case 'india':
			return `🇮🇳 ${`India`}`
		case 'japan':
			return `🇯🇵 ${`Japan`}`
		case 'rotterdam':
			return `🇳🇱 ${`Rotterdam`}`
		case 'russia':
			return `🇷🇺 ${`Russia`}`
		case 'singapore':
			return `🇸🇬 ${`Singapore`}`
		case 'southafrica':
			return `🇿🇦 ${`South Africa`}`
		case 'sydney':
			return `🇦🇺 ${`Sydney`}`
		case 'us-cental':
			return `🇺🇸 ${`US Central`}`
		case 'us-east':
			return `🇺🇸 ${`US East`}`
		case 'us-south':
			return `🇺🇸 ${`US South`}`
		case 'us-west':
			return `🇺🇸 ${`US West`}`
		default:
			return `🗺️ ${`Automatic`}`
	}
}

/**
 * Get the content from a message.
 * @param permission The permission to get the string for
 */
export function getPermissionString(permission: string) {
	switch (permission) {
		case 'ViewChannel': return 'View channels';
		case 'ManageChannels': return 'Manage channels';
		case 'ManageRoles': return 'Manage roles';
		case 'ManageGuildExpressions': return 'Manage expressions';
		case 'ViewAuditLog': return 'View audit log';
		case 'ViewGuildInsights': return 'View server insights';
		case 'ManageWebhooks': return 'Manage webhooks';
		case 'ManageGuild': return 'Manage server';
		case 'CreateInstantInvite': return 'Create invite';
		case 'ChangeNickname': return 'Change nickname';
		case 'ManageNicknames': return 'Manage nicknames';
		case 'KickMembers': return 'Kick members';
		case 'BanMembers': return 'Ban members';
		case 'ModerateMembers': return 'Timeout members';
		case 'SendMessages': return 'Send messages';
		case 'SendMessagesInThreads': return 'Send messages in threads';
		case 'CreatePublicThreads': return 'Create public threads';
		case 'CreatePrivateThreads': return 'Create private threads';
		case 'EmbedLinks': return 'Embed links';
		case 'AttachFiles': return 'Attach files';
		case 'AddReactions': return 'Add reactions';
		case 'UseExternalEmojis': return 'Use external emoji';
		case 'UseExternalStickers': return 'User external stickers';
		case 'MentionEveryone': return 'Mention @everyone, @here, and all roles';
		case 'ManageMessages': return 'Manage messages';
		case 'ManageThreads': return 'Manage threads';
		case 'ReadMessageHistory': return 'Read message history';
		case 'SendTTSMessages': return 'Send text-to-speech messages';
		case 'UseApplicationCommands': return 'Use application commands';
		case 'SendVoiceMessages': return 'Send voice messages';
		case 'Connect': return 'Connect';
		case 'Speak': return 'Speak';
		case 'Stream': return 'Video';
		case 'UseEmbeddedActivities': return 'Use activities';
		case 'UseSoundboard': return 'Use soundboard';
		case 'UseExternalSounds': return 'Use external sounds';
		case 'UseVAD': return 'Use voice activity';
		case 'PrioritySpeaker': return 'Priority speaker';
		case 'MuteMembers': return 'Mute members';
		case 'DeafenMembers': return 'Deafen members';
		case 'MoveMembers': return 'Move members';
		case 'RequestToSpeak': return 'Request to speak';
		case 'ManageEvents': return 'Manage events';
		case 'Administrator': return 'Administrator';
		default: return undefined;
	}
}

export function getChannelDescriptor(channelType: ChannelType) {
	switch (channelType) {
		case ChannelType.GuildAnnouncement: return 'Announcement Channel';
		case ChannelType.GuildCategory: return 'Category';
		case ChannelType.GuildForum: return 'Forum Channel';
		case ChannelType.GuildStageVoice: return 'Stage Channel';
		case ChannelType.GuildText: return 'Text Channel';
		case ChannelType.GuildVoice: return 'Voice Channel';
		default: return 'Channel';
	}
}
