import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, Sticker, StickerFormatType, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildStickerCreate })
export class UserEvent extends Listener {
	public async run(sticker: Sticker) {
		if (isNullish(sticker.id)) return;
		if (isNullish(sticker.guildId)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(sticker.guild?.id as string);
		if (!guildSettingsInfoLogs?.stickerCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = sticker.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.StickerCreate, sticker.guild as Guild, sticker);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, await this.generateGuildLog(sticker, auditLogEntry));
	}

	private async generateGuildLog(sticker: Sticker, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Sticker Created')
			.setDescription(sticker.name)
			.setThumbnail(sticker.url)
			.setFooter({ text: `Sticker ID: ${sticker.id}` })
			.setType(Events.GuildStickerCreate);

		if (sticker.description) embed.addFields({ name: 'Description', value: sticker.description, inline: false });

		embed.addFields({ name: 'Format', value: StickerFormatType[sticker.format], inline: true });

		if (sticker.tags) {
			const emoji = await sticker.guild?.emojis.fetch(sticker.tags);
			if (emoji) embed.addFields({ name: 'Emoji', value: `${emoji.toString()}`, inline: true });
		}

		// This currently should never be truthy, as Guild stickers cannot currently be in packs
		// I'm leaving it in just in case that comes as a part of monetization in the future or something, though
		if (sticker.packId) {
			const stickerPacks = await this.container.client.fetchPremiumStickerPacks();
			const stickerPack = stickerPacks.get(sticker.packId);
			if (stickerPack) embed.addFields({ name: 'In Pack', value: stickerPack.name, inline: true });
		}

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Created By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}

}
