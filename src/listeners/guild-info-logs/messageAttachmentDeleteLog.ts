import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { Attachment, Events, type BaseGuildTextChannel, type Message } from 'discord.js';

const embeddedImageMIMETypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

@ApplyOptions<ListenerOptions>({ event: 'messageAttachmentDeleteLog' })
export class UserEvent extends Listener {
	public async run(message: Message, attachment: Attachment) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: message.guild?.id } });
		if (!guildSettingsInfoLogs?.messageAttachmentDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(message, attachment));
	}

	private generateGuildLog(message: Message, attachment: Attachment) {
		const embed = new GuildLogEmbed()
			.setTitle('Attachment Deleted')
			.addBlankFields({ name: 'Link', value: `[Click to View](${attachment.url})`, inline: true })
			.setDescription(`${message.member!.toString()}: ${message.url}`)
			.setThumbnail(message.member!.displayAvatarURL())
			.addBlankFields({ name: 'Title', value: attachment.name, inline: true })
			.setFooter({ text: `Attachment ID: ${attachment.id}` })
			.setType(Events.MessageDelete);

		if (message?.createdTimestamp) embed.addFields({ name: 'Sent', value: `<t:${Math.round(message.createdTimestamp as number / 1000)}:R>`, inline: false });

		if (embeddedImageMIMETypes.includes(attachment.contentType || '')) {
			embed.setTitle('Image Deleted').setImage(attachment.url);
		}

		return [embed];
	}
}
