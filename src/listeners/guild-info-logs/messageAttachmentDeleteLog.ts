import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { PluralKitMessage } from '#lib/util/pluralkit/PluralKitMessage';
import { pluralkitInGuild } from '#lib/util/pluralkit/pluralkitInGuild';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { Attachment, Events, type BaseGuildTextChannel, type GuildMember, type Message } from 'discord.js';

const embeddedImageMIMETypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

@ApplyOptions<ListenerOptions>({ event: 'messageAttachmentDeleteLog' })
export class UserEvent extends Listener {
	public async run(message: Message, attachment: Attachment) {
		if (isNullish(message.id)) return;
		if (isNullish(message.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: message.guild?.id } });
		if (!guildSettingsInfoLogs?.messageAttachmentDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = message.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		// See if this message was deleted as part of an ongoing purge--don't log it if it is
		const interactionProgress = await this.container.prisma.interactionProgress.findFirst({ where: { entities: { has: message.id } } });
		if (interactionProgress) return;

		let authorOverrideID = '';
		let authorOverride: GuildMember | null = null;

		// Only check if it's a pluralkit message if any of the settings are set to true AND the bot is in the guild
		if ((guildSettingsInfoLogs.pluralkitShowSourceAccount) && (guildSettingsInfoLogs.pluralkitenabled || await pluralkitInGuild(message.guild))) {
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

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(message, attachment, authorOverride));
	}

	private generateGuildLog(message: Message, attachment: Attachment, authorOverride: GuildMember | null) {
		const author = authorOverride || message.member;
		const embed = new GuildLogEmbed()
			.setTitle('Attachment Deleted')
			.addBlankFields({ name: 'Link', value: `[Click to View](${attachment.url})`, inline: true })
			.setDescription(`${author!.toString()}: ${message.url}${authorOverride ? ' **(Proxied by PluralKit)**' : ''}`)
			.setThumbnail(author!.displayAvatarURL())
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
