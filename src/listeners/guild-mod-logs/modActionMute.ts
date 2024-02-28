import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, BaseGuildTextChannel, GuildAuditLogsEntry, GuildMember, type GuildAuditLogsActionType, type GuildAuditLogsTargetType } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionMute })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {

		if (!member.communicationDisabledUntil) return;

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.muteLog && !guildSettingsModActions.muteLogPublic)) return;

		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberUpdate, member.guild, member.user);

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.muteLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, this.generateGuildLog(member, auditLogEntry));
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.muteLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, this.generateGuildLog(member, auditLogEntry));
		}
	}

	private generateGuildLog(member: GuildMember, auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent> | null) {
		const embed = new GuildLogEmbed()
			.setTitle('User Timed Out')
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(CustomEvents.ModActionMute);

		if (member.communicationDisabledUntilTimestamp) {
			embed.addBlankFields({ inline: true });
			embed.addFields({ name: 'Timed Out Until', value: `<t:${Math.round(member.communicationDisabledUntilTimestamp / 1000)}:R>`, inline: true });
		}

		if (auditLogEntry) {
			if (auditLogEntry.executor) embed.addFields({ name: 'Timed Out By', value: auditLogEntry.executor.toString(), inline: false });
			if (auditLogEntry.reason) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
		}

		return [embed];
	}
}
