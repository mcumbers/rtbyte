import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildEmoji, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildEmojiUpdate })
export class UserEvent extends Listener {
	public async run(oldEmoji: GuildEmoji, emoji: GuildEmoji) {
		if (isNullish(emoji.id)) return;
		// This shouldn't be possible, as the only way to edit an emoji is to edit its name...
		// But nonetheless, we'll just avoid this weirdness in case.
		if (oldEmoji.name === emoji.name) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: emoji.guild.id } });
		if (!guildSettingsInfoLogs?.emojiCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = emoji.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.EmojiUpdate, emoji.guild, emoji);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldEmoji, emoji, executor));
	}

	private generateGuildLog(oldEmoji: GuildEmoji, emoji: GuildEmoji, executor: User | null | undefined) {
		const embed = new GuildLogEmbed()
			.setTitle('Emoji Edited')
			.setDescription(emoji.name)
			.setThumbnail(emoji.url)
			.addFields({ name: 'Old Name', value: `\`${oldEmoji.name}\``, inline: true })
			.addFields({ name: 'New Name', value: `\`${emoji.name}\``, inline: true })
			.setFooter({ text: `Emoji ID: ${emoji.id}` })
			.setType(Events.GuildEmojiUpdate);

		if (!isNullish(executor)) embed.addFields({ name: 'Edited By', value: executor.toString(), inline: false });

		return [embed]
	}
}