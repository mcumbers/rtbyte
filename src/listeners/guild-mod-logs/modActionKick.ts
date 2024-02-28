import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildAuditLogsActionType, GuildAuditLogsEntry, GuildAuditLogsTargetType, GuildMember } from 'discord.js';
import { AuditLogEvent } from 'discord.js';

export interface ModActionKickEvent {
	member: GuildMember,
	auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent> | null
}

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionKick })
export class UserEvent extends Listener {
	public async run(event: ModActionKickEvent) {
		const { member } = event;

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.kickLog && !guildSettingsModActions.kickLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.kickLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, this.generateGuildLog(event));
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.kickLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, this.generateGuildLog(event));
		}
	}

	private generateGuildLog({ member, auditLogEntry }: ModActionKickEvent) {
		const embed = new GuildLogEmbed()
			.setTitle('User Kicked From Server')
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.addBlankFields({ name: '', value: '', inline: true })
			.addFields({ name: 'Joined Server', value: `<t:${Math.round(member?.joinedTimestamp as number / 1000)}:R>`, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(CustomEvents.ModActionKick);

		if (auditLogEntry) {
			if (auditLogEntry.reason) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (auditLogEntry.executor) embed.addFields({ name: 'Kicked By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
