import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, BaseGuildTextChannel, GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberRemove })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {

		const kickAuditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberKick, member.guild, member.user);
		if (kickAuditLogEntry) {
			this.container.client.emit(CustomEvents.ModActionKick, { member, auditLogEntry: kickAuditLogEntry });
			// If this is being logged as a Kick, don't log it as a leave
			const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
			if (guildSettingsModActions && ((guildSettingsModActions.modLogChannel && guildSettingsModActions.kickLog) || (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.kickLogPublic))) return;
		}

		const banAuditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanAdd, member.guild, member.user);
		if (banAuditLogEntry) {
			// If this is being logged as a Ban, don't log it as a leave
			const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
			if (guildSettingsModActions && ((guildSettingsModActions.modLogChannel && guildSettingsModActions.banLog) || (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.banLogPublic))) return;
		}

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(member.guild.id);
		if (!guildSettingsInfoLogs?.guildMemberRemoveLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = member.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(member));
	}

	private generateGuildLog(member: GuildMember) {
		const embed = new GuildLogEmbed()
			.setTitle('User Left Server')
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addBlankFields({ name: 'Username', value: member.user.username, inline: true })
			.addBlankFields({ name: '', value: '', inline: true })
			.addBlankFields({ name: 'Joined Server', value: `<t:${Math.round(member?.joinedTimestamp as number / 1000)}:R>`, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(Events.GuildMemberRemove);

		return [embed];
	}
}
