import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildEmoji, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildEmojiCreate })
export class UserEvent extends Listener {
	public async run(emoji: GuildEmoji) {
		if (isNullish(emoji.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: emoji.guild.id } });
		if (!guildSettingsInfoLogs?.emojiCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = emoji.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.EmojiCreate, emoji.guild, emoji);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(emoji, executor));
	}

	private generateGuildLog(emoji: GuildEmoji, executor: User | null | undefined) {
		const embed = new GuildLogEmbed()
			.setTitle('Emoji Created')
			.setDescription(emoji.name)
			.setThumbnail(emoji.url)
			.setFooter({ text: `Emoji ID: ${emoji.id}` })
			.setType(Events.GuildEmojiCreate);

		if (!isNullish(executor)) embed.addFields({ name: 'Created By', value: executor.toString(), inline: true });

		return [embed]
	}
}
