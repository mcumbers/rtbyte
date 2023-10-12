import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, Sticker, StickerFormatType, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildStickerDelete })
export class UserEvent extends Listener {
	public async run(sticker: Sticker) {
		if (isNullish(sticker.id)) return;
		if (isNullish(sticker.guildId)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: sticker.guildId } });
		if (!guildSettingsInfoLogs?.stickerDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = sticker.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.StickerDelete, sticker.guild as Guild, sticker);

		return this.container.client.emit('guildLogCreate', logChannel, await this.generateGuildLog(sticker, executor));
	}

	private async generateGuildLog(sticker: Sticker, executor: User | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Sticker Deleted')
			.setDescription(sticker.name)
			.setThumbnail(sticker.url)
			.setFooter({ text: `Sticker ID: ${sticker.id}` })
			.setType(Events.GuildStickerDelete);

		if (sticker.description) embed.addFields({ name: 'Description', value: sticker.description, inline: false });

		embed.addFields({ name: 'Format', value: StickerFormatType[sticker.format], inline: true });

		if (sticker.createdTimestamp) embed.addFields({ name: 'Created', value: `<t:${Math.round(sticker.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (sticker.tags) {
			const emoji = await sticker.guild?.emojis.fetch(sticker.tags);
			if (emoji) embed.addFields({ name: 'Emoji', value: `${emoji.toString()}`, inline: true });
		}

		if (!isNullish(executor)) embed.addFields({ name: 'Deleted By', value: executor.toString(), inline: false });

		return [embed]
	}
}
