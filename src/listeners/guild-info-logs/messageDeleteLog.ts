import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getContent } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageDelete })
export class UserEvent extends Listener {
	public async run(message: Message) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: message.guild?.id } });
		if (!guildSettingsInfoLogs || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		if (message.attachments.size) {
			for (const attachmentPair of message.attachments) {
				this.container.client.emit('messageAttachmentDeleteLog', message, attachmentPair[1]);
			}
		}

		// Check if this log is enabled in this server after letting the messageAttachmentDeleteLog events fire
		if (!guildSettingsInfoLogs.messageDeleteLog) return;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(message));
	}

	private generateGuildLog(message: Message) {
		const embed = new GuildLogEmbed()
			.setTitle('Message Deleted')
			.setDescription(`${message.member!.toString()}: ${message.url}`)
			.setThumbnail(message.member!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageDelete);

		const messageContent = getContent(message);
		if (messageContent) embed.addFields({ name: 'Message', value: messageContent, inline: false });
		if (message?.createdTimestamp) embed.addFields({ name: 'Sent', value: `<t:${Math.round(message.createdTimestamp as number / 1000)}:R>`, inline: false });

		return messageContent ? [embed] : null;
	}
}
