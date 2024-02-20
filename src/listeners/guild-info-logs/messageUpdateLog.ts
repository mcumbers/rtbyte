import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { PluralKitMessage } from '#lib/util/pluralkit/PluralKitMessage';
import { pluralkitInGuild } from '#lib/util/pluralkit/pluralkitInGuild';
import { getContent } from '#utils/util';
import { UpdateLogStyle } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, GuildMember, Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageUpdate })
export class UserEvent extends Listener {
	public async run(oldMessage: Message, message: Message) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;
		if (message.author.system) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(message.guild.id);
		if (!guildSettingsInfoLogs || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		// Check if any attachments have been removed
		if (oldMessage.attachments.size !== message.attachments.size) {
			const differenceCollection = oldMessage.attachments.difference(message.attachments);
			for (const attachmentPair of differenceCollection) {
				this.container.client.emit('messageAttachmentDeleteLog', message, attachmentPair[1]);
			}
		}

		let authorOverrideID = '';
		let authorOverride: GuildMember | null = null;

		// Only check if it's a pluralkit message if any of the settings are set to true AND the bot is in the guild
		if ((guildSettingsInfoLogs.pluralkitFilterSourceDeletes || guildSettingsInfoLogs.pluralkitShowSourceAccount) && (guildSettingsInfoLogs.pluralkitenabled || await pluralkitInGuild(message.guild))) {
			const pluralkitMessage = await new PluralKitMessage().fetchMessage(message.id);

			// We only need to act if the message was actually handled by PluralKit
			if (pluralkitMessage) {
				// Grab ID of original sender
				if (guildSettingsInfoLogs.pluralkitShowSourceAccount && pluralkitMessage.authorID) authorOverrideID = pluralkitMessage.authorID;
			}
		}

		// If we need to fetch the original author, do that now.
		if (authorOverrideID && authorOverrideID.length) {
			authorOverride = await message.guild.members.fetch(authorOverrideID);
		}

		// Check if this log is enabled in this server after letting the messageAttachmentDeleteLog events fire
		if (!guildSettingsInfoLogs.messageUpdateLog) return;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldMessage, message, guildSettingsInfoLogs.messageUpdateLogStyle, authorOverride));
	}

	private generateGuildLog(oldMessage: Message, message: Message, style: UpdateLogStyle, authorOverride: GuildMember | null) {
		const author = authorOverride || message.member;
		const embed = new GuildLogEmbed()
			.setTitle('Message Edited')
			.setDescription(`${author!.toString()}: ${message.url}${authorOverride ? ' **(Proxied by PluralKit)**' : ''}`)
			.setThumbnail(author!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageUpdate);

		const oldMessageContent = getContent(oldMessage);
		const messageContent = getContent(message);

		if (oldMessageContent !== messageContent) embed.addDiffFields(oldMessageContent as string, messageContent as string, 'Message', style);

		return embed.data.fields?.length ? [embed] : [];
	}
}
