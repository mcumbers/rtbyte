import type { XPMultiplerStore } from '#root/commands/Moderation/xp.js';
import { CustomEvents } from '#utils/CustomTypes';
import { getLevel, messageXPRoll } from '#utils/functions/xp';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { Message } from 'discord.js';

const XP_COOLDOWN = 60 * 1000;

@ApplyOptions<ListenerOptions>({ event: Events.MessageCreate })
export class UserEvent extends Listener {
	public async run(message: Message) {
		if (isNullish(message.author.id) || message.author.bot || isNullish(message.guild) || isNullish(message.member) || message.author.system || message.webhookId) return;
		const { prisma } = this.container;

		// Stop if Guild hasn't configured or enabled XP settings
		const guildSettingsXP = await prisma.guildSettingsXP.fetch(message.guild.id);
		if (!guildSettingsXP || !guildSettingsXP.enabled) return;

		const memberData = await prisma.member.fetchTuple([message.author.id, message.guild.id], ['userID', 'guildID']);
		const userSettings = await prisma.userSettings.fetch(message.author.id);
		const memberDataXP = await prisma.memberDataXP.fetchTuple([message.author.id, message.guild.id], ['userID', 'guildID']);

		// Stop if User has opted-out of using the bot
		if (userSettings && userSettings.disableBot) return;

		// End by creating new memberDataXP object in the database if one doesn't yet exist
		if (!memberDataXP) {
			return prisma.memberDataXP.create({
				data: {
					id: memberData?.id,
					guildID: message.guild.id,
					userID: message.author.id,
					// Per-channel and/or per-role multipliers?
					currentXP: messageXPRoll(),
					lastEarned: message.createdAt
				}
			});
		}

		// End if member isn't eligible to earn XP again yet
		if (memberDataXP.lastEarned && (memberDataXP.lastEarned.getTime() + XP_COOLDOWN) > Date.now()) return;

		// Start with user's personal multiplier
		let xpMultiplier = memberDataXP.multiplier;

		// See if the channel where message was sent has a multiplier
		const channelMultipliers = guildSettingsXP.channelMultipliers as any as XPMultiplerStore;
		if (channelMultipliers && channelMultipliers.multipliers && channelMultipliers.multipliers.length) {
			const channelMultiplier = channelMultipliers.multipliers.find((entry) => entry.id === message.channel.id);
			// Apply multiplier if one is found for this channel
			if (channelMultiplier) {
				if (guildSettingsXP.multiplierBehaviour === 'HIGHEST') xpMultiplier = xpMultiplier > channelMultiplier.multiplier ? xpMultiplier : channelMultiplier.multiplier;
				if (guildSettingsXP.multiplierBehaviour === 'STACK') xpMultiplier += channelMultiplier.multiplier;
				if (guildSettingsXP.multiplierBehaviour === 'COMPOUND') xpMultiplier *= channelMultiplier.multiplier;
			}
		}

		// See if any of the user's roles have multipliers
		const roleMultipliers = guildSettingsXP.roleMultipliers as any as XPMultiplerStore;
		if (roleMultipliers && roleMultipliers.multipliers && roleMultipliers.multipliers.length) {
			for (const role of message.member.roles.cache.values()) {
				const roleMultiplier = roleMultipliers.multipliers.find((entry) => entry.id === role.id);
				// Apply multiplier if one is found for this role
				if (roleMultiplier) {
					if (guildSettingsXP.multiplierBehaviour === 'HIGHEST') xpMultiplier = xpMultiplier > roleMultiplier.multiplier ? xpMultiplier : roleMultiplier.multiplier;
					if (guildSettingsXP.multiplierBehaviour === 'STACK') xpMultiplier += roleMultiplier.multiplier;
					if (guildSettingsXP.multiplierBehaviour === 'COMPOUND') xpMultiplier *= roleMultiplier.multiplier;
				}
			}
		}

		// Roll for XP earned with this message
		const earnedXP = messageXPRoll(0, xpMultiplier);
		// Calculate old and new levels
		const oldLevel = getLevel(memberDataXP.currentXP);
		const newLevel = getLevel(memberDataXP.currentXP + earnedXP);
		// Emit guildXPLevelUp event if member levelled up with this message
		if (oldLevel.level > newLevel.level) this.container.client.emit(CustomEvents.GuildXPLevelUp, message.member, newLevel, message);

		// Update memberXP object in the database
		return prisma.memberDataXP.update({
			where: { id: memberDataXP.id }, data: {
				currentXP: newLevel.totalXP,
				lastEarned: message.createdAt
			}
		});
	}
}
