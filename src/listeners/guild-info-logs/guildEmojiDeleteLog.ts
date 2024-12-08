import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildEmoji, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildEmojiDelete })
export class UserEvent extends Listener {
	public async run(emoji: GuildEmoji) {
		if (isNullish(emoji.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(emoji.guild.id);
		if (!guildSettingsInfoLogs?.emojiDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = emoji.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.EmojiDelete, emoji.guild, emoji);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(emoji, auditLogEntry));
	}

	private generateGuildLog(emoji: GuildEmoji, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Emoji Deleted')
			.setDescription(emoji.name)
			.setThumbnail(emoji.url)
			.setFooter({ text: `Emoji ID: ${emoji.id}` })
			.setType(Events.GuildEmojiDelete);

		if (emoji.createdTimestamp) embed.addBlankFields({ name: 'Created', value: `<t:${Math.round(emoji.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addBlankFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addBlankFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
