import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, GuildScheduledEvent, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildScheduledEventUpdate })
export class UserEvent extends Listener {
	public async run(oldEvent: GuildScheduledEvent, event: GuildScheduledEvent) {
		if (isNullish(event.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(event.guild?.id as string);
		if (!guildSettingsInfoLogs?.guildScheduledEventUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = event.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.GuildScheduledEventUpdate, event.guild as Guild, event);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldEvent, event, auditLogEntry));
	}

	private generateGuildLog(oldEvent: GuildScheduledEvent, event: GuildScheduledEvent, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle(`Event Updated`)
			.setDescription(`[${event.name as string}](${event.url as string})`)
			.setThumbnail(event.guild!.iconURL())
			.setFooter({ text: `Event ID: ${event.id}` })
			.setType(Events.GuildScheduledEventUpdate);

		if (oldEvent.name !== event.name) {
			embed.addFields({ name: 'Name Changed', value: `\`\`\`diff\n-${oldEvent.name}\n+${event.name}\n\`\`\``, inline: false });
		}

		if ((oldEvent.entityType !== event.entityType) || oldEvent.channel !== event.channel) {
			const oldEventLocation = oldEvent.entityMetadata?.location ? `${oldEvent.entityMetadata.location}` : `<#${oldEvent.channelId}>`;
			const eventLocation = event.entityMetadata?.location ? `${event.entityMetadata.location}` : `<#${event.channelId}>`;
			embed.addFields({ name: 'Location Changed', value: `${oldEventLocation} -> ${eventLocation}`, inline: false });
		}

		if (oldEvent.scheduledStartTimestamp !== event.scheduledStartTimestamp) {
			const oldStartTimestamp = `<t:${Math.round(oldEvent.scheduledStartTimestamp as number / 1000)}:f>`;
			const startTimestamp = `<t:${Math.round(event.scheduledStartTimestamp as number / 1000)}:f>`;
			embed.addFields({ name: 'Start Time Changed', value: `${oldStartTimestamp} -> ${startTimestamp}`, inline: false });
		}

		if (oldEvent.scheduledEndTimestamp !== event.scheduledEndTimestamp) {
			const oldEndTimestamp = oldEvent.scheduledEndTimestamp ? `<t:${Math.round(oldEvent.scheduledEndTimestamp as number / 1000)}:f>` : inlineCodeBlock('Not set');
			const endTimestamp = event.scheduledEndTimestamp ? `<t:${Math.round(event.scheduledEndTimestamp as number / 1000)}:f>` : inlineCodeBlock('Not set');
			embed.addFields({ name: 'End Time Changed', value: `${oldEndTimestamp} -> ${endTimestamp}`, inline: false });
		}

		if (oldEvent.description !== event.description) {
			embed.addFields({ name: 'Description Changed', value: `\`\`\`diff\n-${oldEvent.description}\n+${event.description}\n\`\`\``, inline: false });
		}

		if (oldEvent.image !== event.image) {
			if (!oldEvent.image) embed.addFields({ name: 'Image Added', value: `[New Image](${event.coverImageURL()})`, inline: true });
			if (!event.image) embed.addFields({ name: 'Image Changed', value: 'Image Removed', inline: true });
			if (oldEvent.image && event.image) embed.addFields({ name: 'Image Changed', value: `[New Image](${event.coverImageURL()})`, inline: false });
		}

		// Add audit log info to embed
		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Edited By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return embed.data.fields?.length ? [embed] : [];
	}
}
