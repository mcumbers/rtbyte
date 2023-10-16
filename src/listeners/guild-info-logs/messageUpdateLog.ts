import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getContent } from '#utils/util';
import { UpdateLogStyle } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageUpdate })
export class UserEvent extends Listener {
	public async run(oldMessage: Message, message: Message) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;
		if (message.author.bot) return;
		if (message.author.system) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: message.guild?.id } });
		if (!guildSettingsInfoLogs || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		// Check if any attachments have been removed
		if (oldMessage.attachments.size !== message.attachments.size) {
			const differenceCollection = oldMessage.attachments.difference(message.attachments);
			for (const attachmentPair of differenceCollection) {
				this.container.client.emit('messageAttachmentDeleteLog', message, attachmentPair[1]);
			}
		}

		// Check if this log is enabled in this server after letting the messageAttachmentDeleteLog events fire
		if (!guildSettingsInfoLogs.messageUpdateLog) return;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldMessage, message, guildSettingsInfoLogs.messageUpdateLogStyle));
	}

	private generateGuildLog(oldMessage: Message, message: Message, style: UpdateLogStyle) {
		const embed = new GuildLogEmbed()
			.setTitle('Message Edited')
			.setDescription(`${message.member!.toString()}: ${message.url}`)
			.setThumbnail(message.member!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageUpdate);

		const oldMessageContent = getContent(oldMessage);
		const messageContent = getContent(message);

		if (oldMessageContent !== messageContent) embed.addDiffFields(oldMessageContent as string, messageContent as string, 'Message', style);

		if (!embed.data.fields?.length) return;
		return [embed]
	}
}
