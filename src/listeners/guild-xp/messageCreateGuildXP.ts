import { getLevel, messageXPRoll } from '#utils/functions/xp';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { Message } from 'discord.js';

const XP_COOLDOWN = 60 * 1000;

@ApplyOptions<ListenerOptions>({ event: Events.MessageCreate })
export class UserEvent extends Listener {
	public async run(message: Message) {
		if (isNullish(message.author.id) || message.author.bot || isNullish(message.guild) || message.author.system || message.webhookId) return;
		const { prisma } = this.container;

		// Stop if Guild hasn't configured or enabled XP settings
		const guildSettingsXP = await prisma.guildSettingsXP.findFirst({ where: { id: message.guild.id } });
		if (!guildSettingsXP || !guildSettingsXP.enabled) return;

		const memberData = await prisma.member.findFirst({ where: { userID: message.author.id, guildID: message.guild.id }, include: { user: { include: { settings: true } }, xpData: true } });

		// Stop if User has opted-out of using the bot
		if (memberData?.user.settings && memberData.user.settings.disableBot) return;

		// End by creating new memberDataXP object in the database if one doesn't yet exist
		if (!memberData?.xpData) {
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
		if (memberData?.xpData.lastEarned && (memberData?.xpData.lastEarned.getTime() + XP_COOLDOWN) > Date.now()) return;

		// Roll for XP earned with this message
		// Per-channel and/or per-role multipliers?
		const earnedXP = messageXPRoll(0, memberData?.xpData.multiplier);
		// Calculate old and new levels
		const oldLevel = getLevel(memberData?.xpData.currentXP);
		const newLevel = getLevel(memberData?.xpData.currentXP + earnedXP);
		// Emit guildXPLevelUp event if member levelled up with this message
		if (oldLevel.level > newLevel.level) this.container.client.emit('guildXPLevelUp', message.member, newLevel, message);

		// Update memberXP object in the database
		return prisma.memberDataXP.update({
			where: { id: memberData?.xpData.id }, data: {
				currentXP: newLevel.totalXP,
				lastEarned: message.createdAt
			}
		});
	}
}
