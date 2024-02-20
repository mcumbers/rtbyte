import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { PluralKitCommands } from '#lib/util/constants';
import { PluralKitMessage } from '#lib/util/pluralkit/PluralKitMessage';
import { pluralkitInGuild } from '#lib/util/pluralkit/pluralkitInGuild';
import { getContent } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, GuildMember, Message } from 'discord.js';

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

		// See if this message was deleted as part of an ongoing purge--don't log it if it is
		const liveInteraction = this.container.liveCache.liveInteractions.find((entry) => entry.entities.includes(message.id));
		if (liveInteraction) return;

		// If the message appears to be a PluralKit command, ignore the message delete
		if (guildSettingsInfoLogs.pluralkitFilterCommands) {
			if (PluralKitCommands.some(command => message.content.startsWith(command))) return;
		}

		let authorOverrideID = '';
		let authorOverride: GuildMember | null = null;

		// Only check if it's a pluralkit message if any of the settings are set to true AND the bot is in the guild
		if ((guildSettingsInfoLogs.pluralkitFilterSourceDeletes || guildSettingsInfoLogs.pluralkitShowSourceAccount) && (guildSettingsInfoLogs.pluralkitenabled || await pluralkitInGuild(message.guild))) {
			const pluralkitMessage = await new PluralKitMessage().fetchMessage(message.id);

			// We only need to act if the message was actually handled by PluralKit
			if (pluralkitMessage) {
				// Don't log deletes of original messages by PluralKit
				if (guildSettingsInfoLogs.pluralkitFilterSourceDeletes && message.id === pluralkitMessage.originalID) return;

				// Grab ID of original sender
				if (guildSettingsInfoLogs.pluralkitShowSourceAccount && pluralkitMessage.authorID) authorOverrideID = pluralkitMessage.authorID;
			}
		}

		// If we need to fetch the original author, do that now.
		if (authorOverrideID && authorOverrideID.length) {
			authorOverride = await message.guild.members.fetch(authorOverrideID);
		}

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(message, authorOverride));
	}

	private generateGuildLog(message: Message, authorOverride: GuildMember | null) {
		const author = authorOverride || message.member;
		const embed = new GuildLogEmbed()
			.setTitle('Message Deleted')
			.setDescription(`${author!.toString()}: ${message.url}${authorOverride ? ' **(Proxied by PluralKit)**' : ''}`)
			.setThumbnail(author!.displayAvatarURL())
			.setFooter({ text: `Message ID: ${message.id}` })
			.setType(Events.MessageDelete);

		const messageContent = getContent(message);
		if (messageContent) embed.addFields({ name: 'Message', value: messageContent, inline: false });
		if (message?.createdTimestamp) embed.addFields({ name: 'Sent', value: `<t:${Math.round(message.createdTimestamp as number / 1000)}:R>`, inline: false });

		return messageContent ? [embed] : null;
	}
}
