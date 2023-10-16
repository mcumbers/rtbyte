import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { cutText, inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, StageInstance, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.StageInstanceCreate })
export class UserEvent extends Listener {
	public async run(stage: StageInstance) {
		if (isNullish(stage.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: stage.guild?.id } });
		if (!guildSettingsInfoLogs?.stageInstanceCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = stage.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.StageInstanceCreate, stage.guild as Guild, stage);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(stage, auditLogEntry));
	}

	private generateGuildLog(stage: StageInstance, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setAuthor({
				name: cutText(stage.topic, 256),
				url: `https://discord.com/channels/${stage.guildId}/${stage.channelId}`,
				iconURL: stage.guild?.iconURL() ?? undefined
			})
			.setDescription(inlineCodeBlock(stage.id))
			.addFields({ name: 'Stage channel', value: `<#${stage.channelId}>`, inline: true })
			.setFooter({ text: `Stage started ${isNullish(auditLogEntry?.executor) ? '' : `by ${auditLogEntry?.executor.username}`}`, iconURL: isNullish(auditLogEntry?.executor) ? undefined : auditLogEntry?.executor?.displayAvatarURL() })
			.setType(Events.StageInstanceCreate);

		if (stage.guildScheduledEvent) embed.addFields({ name: 'Associated event', value: `[${inlineCodeBlock(`${stage.guildScheduledEvent.name}`)}](${stage.guildScheduledEvent.url})`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Created By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
