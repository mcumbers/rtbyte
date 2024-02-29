import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, BaseGuildTextChannel, GuildAuditLogsEntry, GuildMember, type GuildAuditLogsActionType, type GuildAuditLogsTargetType } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionUnmute })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberUpdate, member.guild, member.user);

		// Log ModAction
		await this.container.prisma._prisma.modAction.create({
			data: {
				guildID: member.guild.id,
				type: ModActionType.UNMUTE,
				targetID: member.id,
				executorID: auditLogEntry?.executorId,
				auditLogID: auditLogEntry?.id,
				createdAt: auditLogEntry?.createdAt || new Date(),
				reason: auditLogEntry?.reason
			}
		});

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.unmuteLog && !guildSettingsModActions.unmuteLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.unmuteLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, this.generateGuildLog(member, auditLogEntry));
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.unmuteLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, this.generateGuildLog(member, auditLogEntry));
		}
	}

	private generateGuildLog(member: GuildMember, auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent> | null) {
		const embed = new GuildLogEmbed()
			.setTitle('User Timeout Removed')
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(CustomEvents.ModActionUnmute);

		if (auditLogEntry) {
			if (auditLogEntry.executor) embed.addFields({ name: 'Timeout Removed By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
