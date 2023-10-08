import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ZeroWidthSpace } from "#utils/constants";
import { getContent } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import * as Diff from 'diff';
import { BaseGuildTextChannel, Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageUpdate })
export class UserEvent extends Listener {
	public async run(oldMessage: Message, message: Message) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;
		if (message.author.bot) return;
		if (message.author.system) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: message.guild?.id } });
		if (!guildSettingsInfoLogs?.messageUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldMessage, message));
	}

	private generateGuildLog(oldMessage: Message, message: Message) {
		const embed = new GuildLogEmbed()
			.setTitle('Message Edited')
			.setDescription(`${message.member!.toString()}: ${message.url}`)
			.setThumbnail(message.member!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageUpdate);

		const oldMessageContent = getContent(oldMessage);
		const messageContent = getContent(message);
		const diff = Diff.diffChars(oldMessageContent as string, messageContent as string);

		let workingString = '';

		for (const part of diff) {
			workingString += `${part.added ? '+' : part.removed ? '-' : '~'} ${part.value}\n`;
		}

		if (oldMessageContent !== messageContent) {
			if (oldMessageContent) embed.addFields({ name: 'Changes', value: `\`\`\`diff\n${workingString.replaceAll('```', `\`${ZeroWidthSpace}\`\``)}\`\`\``, inline: false });
			if (messageContent) embed.addFields({ name: 'New Message', value: messageContent, inline: false });
		}

		if (!embed.data.fields?.length) return;
		return [embed]
	}
}
