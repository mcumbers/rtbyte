import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { UpdateLogStyle } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, Sticker, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildStickerUpdate })
export class UserEvent extends Listener {
	public async run(oldSticker: Sticker, sticker: Sticker) {
		if (isNullish(sticker.id)) return;
		if (isNullish(sticker.guildId)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: sticker.guildId } });
		if (!guildSettingsInfoLogs?.stickerUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = sticker.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.StickerUpdate, sticker.guild as Guild, sticker);

		return this.container.client.emit('guildLogCreate', logChannel, await this.generateGuildLog(oldSticker, sticker, executor, guildSettingsInfoLogs.stickerUpdateLogStyle));
	}

	private async generateGuildLog(oldSticker: Sticker, sticker: Sticker, executor: User | null, style: UpdateLogStyle) {
		const embed = new GuildLogEmbed()
			.setTitle('Sticker Edited')
			.setDescription(sticker.name)
			.setThumbnail(sticker.url)
			.setFooter({ text: `Sticker ID: ${sticker.id}` })
			.setType(Events.GuildStickerUpdate);


		if (sticker.name !== oldSticker.name) embed.addDiffFields(oldSticker.name as string, sticker.name as string, 'Name', style);

		if (sticker.description !== oldSticker.description) embed.addDiffFields(oldSticker.description as string, sticker.description as string, 'Description', style);

		if (sticker.tags !== oldSticker.tags) {
			const emoji = sticker.tags ? await sticker.guild?.emojis.fetch(sticker.tags) : null;
			const oldEmoji = oldSticker.tags ? await sticker.guild?.emojis.fetch(oldSticker.tags) : null;
			embed.addFields({ name: 'Emoji Changed', value: `${oldEmoji?.toString()}   ->   ${emoji?.toString()}`, inline: true });
		}

		if (!isNullish(executor)) embed.addFields({ name: 'Edited By', value: executor.toString(), inline: false });

		return [embed]
	}
}
