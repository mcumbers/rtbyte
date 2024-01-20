import { getLevel } from '#utils/functions/xp';
import type { MemberDataXP } from '@prisma/client';
import type { ClientUser, Guild, GuildChannel, GuildMember, Message, User } from 'discord.js';

export interface Placeholders {
	BOT_NAME?: string,
	BOT_MENTION?: string,
	GUILD_NAME?: string,
	GUILD_SIZE?: string,
	MEMBER_NAME?: string,
	MEMBER_MENTION?: string,
	USER_USERNAME?: string,
	USER_MENTION?: string,
	CHANNEL_NAME?: string,
	CHANNEL_MENTION?: string,
	XP_TOTAL?: string,
	XP_LEVEL_XP?: string,
	XP_LEVEL?: string,
	MESSAGE?: string
}

export interface PlaceholderContext {
	bot?: ClientUser,
	guild?: Guild,
	member?: GuildMember,
	user?: User,
	xp?: MemberDataXP,
	channel?: GuildChannel,
	message?: Message
}

export function parseMessage(message: string, context: PlaceholderContext) {
	const placeholders = getContextualPlaceholders(context);
	// eslint-disable-next-line guard-for-in
	for (const placeholder in placeholders) {
		const replacement = placeholders[placeholder as keyof Placeholders] as string;
		message = message.replace(`%${placeholder}%`, `${replacement}`);
	}

	return message;
}

function getContextualPlaceholders(context: PlaceholderContext) {
	const placeholders: Placeholders = {};
	if (context.bot) {
		placeholders.BOT_NAME = context.bot.username;
		placeholders.BOT_MENTION = `<@${context.bot.id}>`;
	}

	if (context.guild) {
		placeholders.GUILD_NAME = context.guild.name;
		placeholders.GUILD_SIZE = `${context.guild.memberCount}`;
	}

	if (context.member) {
		placeholders.MEMBER_NAME = context.member.displayName;
		placeholders.MEMBER_MENTION = `<@${context.member.id}>`;
	}

	if (context.user) {
		placeholders.USER_USERNAME = context.user.displayName;
		placeholders.USER_MENTION = `<@${context.user.id}>`;
	}

	if (context.channel) {
		placeholders.CHANNEL_NAME = context.channel.name;
		placeholders.CHANNEL_MENTION = `<#${context.channel.id}>`;
	}

	if (context.xp) {
		const xpLevel = getLevel(context.xp.currentXP);
		placeholders.XP_TOTAL = `${xpLevel.totalXP}`;
		placeholders.XP_LEVEL_XP = `${xpLevel.levelXP}`;
		placeholders.XP_LEVEL = `${xpLevel.level}`;
	}

	if (context.message) {
		placeholders.MESSAGE = context.message.content;
	}

	return placeholders;
}
