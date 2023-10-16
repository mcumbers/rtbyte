import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { Emojis } from '#utils/constants';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { codeBlock, cutText, inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, StageInstance, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.StageInstanceUpdate })
export class UserEvent extends Listener {
	public async run(oldStage: StageInstance, stage: StageInstance) {
		if (isNullish(stage.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: stage.guild?.id } });
		if (!guildSettingsInfoLogs?.stageInstanceUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = stage.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.StageInstanceUpdate, stage.guild as Guild);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldStage, stage, auditLogEntry));
	}

	private generateGuildLog(oldStage: StageInstance, stage: StageInstance, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setAuthor({
				name: cutText(stage.topic, 256),
				url: `https://discord.com/channels/${stage.guildId}/${stage.channelId}`,
				iconURL: stage.guild?.iconURL() ?? undefined
			})
			.setDescription(inlineCodeBlock(stage.id))
			.setFooter({ text: `Stage updated ${isNullish(auditLogEntry?.executor) ? '' : `by ${auditLogEntry?.executor.username}`}`, iconURL: isNullish(auditLogEntry?.executor) ? undefined : auditLogEntry?.executor?.displayAvatarURL() })
			.setType(Events.StageInstanceUpdate);

		if (stage.guildScheduledEvent) embed.addFields({ name: 'Associated event', value: `[${inlineCodeBlock(`${stage.guildScheduledEvent.name}`)}](${stage.guildScheduledEvent.url})`, inline: true });

		const changes = [];
		const privacyLevels = ['', 'Public', 'Members only']
		if (oldStage.topic !== stage.topic) changes.push(`${Emojis.Bullet}**Topic**:\n${codeBlock(`${oldStage.topic}`)}to\n${codeBlock(`${stage.topic}`)}`);
		if (oldStage.privacyLevel !== stage.privacyLevel) changes.push(`${Emojis.Bullet}**Privacy**: ${privacyLevels[oldStage.privacyLevel]} to ${privacyLevels[stage.privacyLevel]}`);
		if (changes.length) embed.addFields({ name: 'Changes', value: changes.join('\n') });

		return [embed]
	}
}
