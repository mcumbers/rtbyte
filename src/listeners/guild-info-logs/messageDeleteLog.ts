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
		if (!guildSettingsInfoLogs?.messageDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(message));
	}

	private generateGuildLog(message: Message) {
		const embed = new GuildLogEmbed()
			.setTitle('Message Deleted')
			.setDescription(`${message.member!.toString()}: ${message.channel.url}`)
			.setThumbnail(message.member!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageUpdate);

		const messageContent = getContent(message);
		if (messageContent) embed.addFields({ name: 'Message', value: messageContent, inline: false });
		if (message?.createdTimestamp) embed.addFields({ name: 'Sent', value: `<t:${Math.round(message.createdTimestamp as number / 1000)}:R>`, inline: false });

		return [embed]
	}
}
