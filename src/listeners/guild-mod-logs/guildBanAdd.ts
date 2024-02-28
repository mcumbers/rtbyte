import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { BaseGuildTextChannel, GuildAuditLogsEntry, GuildBan, GuildMember } from 'discord.js';
import { AuditLogEvent } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildBanAdd })
export class UserEvent extends Listener {
	public async run(guildBan: GuildBan) {
		// Try to grab the GuildMember for the banned user from the cache as fast as possible
		const bannedMember = guildBan.guild.members.resolve(guildBan.user.id);

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(guildBan.guild.id);
		if (!guildSettingsInfoLogs?.channelDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = guildBan.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanAdd, guildBan.guild, guildBan.user);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, await this.generateGuildLog(guildBan, auditLogEntry, bannedMember));
	}

	private async generateGuildLog(guildBan: GuildBan, auditLogEntry: GuildAuditLogsEntry | null, bannedMember: GuildMember | null) {
		const embed = new GuildLogEmbed()
			.setTitle('User Banned from Server')
			.setDescription(guildBan.user.username)
			.setThumbnail(guildBan.user.avatarURL())
			.setFooter({ text: `User ID: ${guildBan.user.id}` })
			.setType(Events.GuildBanAdd);

		const memberData = await this.container.prisma.member.fetchTuple([guildBan.user.id, guildBan.guild.id], ['userID', 'guildID']);

		if (memberData) {
			if (memberData.displayNameHistory.length) {
				// TODO: Limit to last 5 display names?
				const displayNames = `\`\`\`md\n-\t${memberData.displayNameHistory.join('\n-\t')}\n\`\`\``;
				embed.addFields({ name: 'Known as', value: displayNames, inline: false });
			}
		}

		if (bannedMember) {
			embed.addFields({ name: `${bannedMember.flags.has("DidRejoin") ? 'Last ' : ''}Joined Server`, value: `<t:${Math.round(bannedMember.joinedTimestamp as number / 1000)}:R>`, inline: true });
		}

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Banned By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
