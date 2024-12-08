import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, GuildScheduledEvent, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildScheduledEventDelete })
export class UserEvent extends Listener {
	public async run(event: GuildScheduledEvent) {
		if (isNullish(event.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(event.guild?.id as string);
		if (!guildSettingsInfoLogs?.guildScheduledEventDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = event.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.GuildScheduledEventDelete, event.guild as Guild, event);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(event, auditLogEntry));
	}

	private generateGuildLog(event: GuildScheduledEvent, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Event Deleted')
			.setThumbnail(event.guild!.iconURL())
			.setFooter({ text: `Event ID: ${event.id}` })
			.setType(Events.GuildScheduledEventDelete);

		if (event.name) embed.setDescription(event.name as string);
		if (event.description && !event.name) embed.addBlankFields({ name: 'Description', value: event.description as string, inline: false });

		if (event.createdTimestamp) embed.addBlankFields({ name: 'Created', value: `<t:${Math.round(event.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addBlankFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addBlankFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
