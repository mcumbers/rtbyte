import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, StageInstance, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.StageInstanceDelete })
export class UserEvent extends Listener {
	public async run(stage: StageInstance) {
		if (isNullish(stage.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(stage.guild?.id as string);
		if (!guildSettingsInfoLogs?.stageInstanceDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = stage.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.StageInstanceDelete, stage.guild as Guild);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(stage, auditLogEntry));
	}

	private generateGuildLog(stage: StageInstance, auditLogEntry: GuildAuditLogsEntry | null) {
		if (!stage.guildId || !stage.channelId) return [];

		const embed = new GuildLogEmbed()
			.setTitle('Stage Instance Ended')
			.setDescription(`${stage.channel?.toString()}${stage.topic ? `: ${stage.topic}` : ''}`)
			.addFields({ name: 'Started', value: `<t:${Math.round(stage.createdTimestamp as number / 1000)}:R>`, inline: true })
			.setThumbnail(stage.guild!.iconURL() as string)
			.setFooter({ text: `Stage ID: ${stage.id}` })
			.setType(Events.StageInstanceDelete);

		if (stage.guildScheduledEvent) embed.addFields({ name: 'For Event', value: `[${stage.guildScheduledEvent.name}](${stage.guildScheduledEvent.url})`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
