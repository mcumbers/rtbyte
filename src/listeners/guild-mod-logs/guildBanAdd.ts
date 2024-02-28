import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildAuditLogsEntry, GuildBan, GuildMember } from 'discord.js';
import { AuditLogEvent } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildBanAdd })
export class UserEvent extends Listener {
	public async run(guildBan: GuildBan) {
		// Try to grab the GuildMember for the banned user from the cache as fast as possible
		const bannedMember = guildBan.guild.members.resolve(guildBan.user.id);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(guildBan.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.kickLog && !guildSettingsModActions.kickLogPublic)) return;

		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanAdd, guildBan.guild, guildBan.user);

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.kickLog) {
			const modLogChannel = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, await this.generateGuildLog(guildBan, auditLogEntry, bannedMember));
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.kickLogPublic) {
			const modLogChannelPublic = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, await this.generateGuildLog(guildBan, auditLogEntry, bannedMember));
		}
	}

	private async generateGuildLog(guildBan: GuildBan, auditLogEntry: GuildAuditLogsEntry | null, bannedMember: GuildMember | null) {
		const embed = new GuildLogEmbed()
			.setTitle('User Banned from Server')
			.setDescription(guildBan.user.toString())
			.setThumbnail(guildBan.user.avatarURL())
			.addFields({ name: 'Username', value: guildBan.user.username, inline: true })
			.setFooter({ text: `User ID: ${guildBan.user.id}` })
			.setType(Events.GuildBanAdd);

		if (bannedMember) {
			embed.addBlankFields({ name: '', value: '', inline: true });
			embed.addFields({ name: `${bannedMember.flags.has("DidRejoin") ? 'Last ' : ''}Joined Server`, value: `<t:${Math.round(bannedMember.joinedTimestamp as number / 1000)}:R>`, inline: true });
		}

		const memberData = await this.container.prisma.member.fetchTuple([guildBan.user.id, guildBan.guild.id], ['userID', 'guildID']);

		if (memberData) {
			if (memberData.displayNameHistory.length) {
				// TODO: Limit to last 5 display names?
				const displayNames = `\`\`\`md\n-\t${memberData.displayNameHistory.join('\n-\t')}\n\`\`\``;
				embed.addFields({ name: 'Known as', value: displayNames, inline: false });
			}
		}

		if (auditLogEntry) {
			if (auditLogEntry.reason) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (auditLogEntry.executor) embed.addFields({ name: 'Banned By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
