import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { PluralKitMessage } from '#lib/util/pluralkit/PluralKitMessage';
import { pluralkitInGuild } from '#lib/util/pluralkit/pluralkitInGuild';
import { CustomEvents } from '#utils/CustomTypes';
import { getContent } from '#utils/util';
import { UpdateLogStyle } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildMember, Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageUpdate })
export class UserEvent extends Listener {
	public async run(oldMessage: Message, message: Message) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;
		if (message.author.system) return;
		if (message.author.id === this.container.client.id) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(message.guild.id);
		if (!guildSettingsInfoLogs || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		// Check if any attachments have been removed
		if (oldMessage.attachments.size !== message.attachments.size) {
			const differenceCollection = oldMessage.attachments.difference(message.attachments);
			for (const attachmentPair of differenceCollection) {
				this.container.client.emit(CustomEvents.MessageAttachmentDelete, message, attachmentPair[1]);
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

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, await this.generateGuildLog(oldMessage, message, guildSettingsInfoLogs.messageUpdateLogStyle, authorOverride));
	}

	private async generateGuildLog(oldMessage: Message, message: Message, style: UpdateLogStyle, authorOverride: GuildMember | null) {
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

		// Message Pinning/Un-Pinning is weird. It's got its own AuditLogEvent type, but when it happens it fires the MessageUpdate Event
		// Also, the target property of a MessagePin/UnPin Audit Log Event is the Executor--not the Message or the Message Author
		// So we use a specific strategy for this one to find the Audit Log Entry
		if (oldMessage.pinned !== message.pinned) {
			if (message.pinned) {
				const logs = await message.guild?.fetchAuditLogs({ type: AuditLogEvent.MessagePin, limit: 25 });
				if (logs) {
					const targetEntry = logs.entries.filter((entry) => entry.extra.messageId === message.id).sort((entryA, entryB) => entryB.createdTimestamp - entryA.createdTimestamp).first();
					if (targetEntry) embed.addBlankFields({ name: 'Message Pinned', value: `Pinned By ${targetEntry.executor?.toString()}`, inline: false });
				}
			}
			if (oldMessage.pinned) {
				const logs = await message.guild?.fetchAuditLogs({ type: AuditLogEvent.MessageUnpin, limit: 25 });
				if (logs) {
					const targetEntry = logs.entries.filter((entry) => entry.extra.messageId === message.id).sort((entryA, entryB) => entryB.createdTimestamp - entryA.createdTimestamp).first();
					if (targetEntry) embed.addBlankFields({ name: 'Message Un-Pinned', value: `Un-Pinned By ${targetEntry.executor?.toString()}`, inline: false });
				}
			}
		}

		return embed.data.fields?.length ? [embed] : [];
	}
}
