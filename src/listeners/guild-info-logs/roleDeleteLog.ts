import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Role, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildRoleDelete })
export class UserEvent extends Listener {
	public async run(role: Role) {
		if (isNullish(role.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: role.guild.id } });
		if (!guildSettingsInfoLogs?.roleDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = role.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.RoleDelete, role.guild, role);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(role, auditLogEntry));
	}

	private generateGuildLog(role: Role, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setAuthor({
				name: `${role?.unicodeEmoji ?? ''} ${role.name}`,
				iconURL: role.guild.iconURL() ?? undefined
			})
			.setDescription(inlineCodeBlock(role.id))
			.setFooter({ text: `Role deleted ${isNullish(auditLogEntry?.executor) ? '' : `by ${auditLogEntry?.executor.username}`}`, iconURL: isNullish(auditLogEntry?.executor) ? undefined : auditLogEntry?.executor?.displayAvatarURL() })
			.setType(Events.GuildRoleDelete);

		if (role?.createdTimestamp) embed.addFields({ name: 'Created', value: `<t:${Math.round(role.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
