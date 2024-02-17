import { BotCommand } from '#lib/extensions/BotCommand';
import { BotEmbed } from '#lib/extensions/BotEmbed';
import { Colors } from "#utils/constants";
import { type ChatInputCommand, type ContextMenuCommand } from '@sapphire/framework';
import { ActionRowBuilder, ApplicationCommandType, ChannelSelectMenuBuilder, ChannelType, ComponentType, PermissionFlagsBits, type TextChannel } from 'discord.js';

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerContextMenuCommand((builder) =>
			builder
				.setName('Quote Message')
				.setType(ApplicationCommandType.Message)
				.setDefaultMemberPermissions(PermissionFlagsBits.ReadMessageHistory));
	}

	public async contextMenuRun(interaction: ContextMenuCommand.Interaction) {
		if (!interaction.isMessageContextMenuCommand() || !interaction.targetMessage) return;
		await interaction.deferReply({ ephemeral: true, fetchReply: true });

		// Build the Quote Embed
		const message = interaction.targetMessage;
		const quoteEmbed = new BotEmbed()
			.setAuthor({
				name: message.member?.displayName ?? message.author.username,
				url: `https://discord.com/users/${message.author.id}`,
				iconURL: message.author.displayAvatarURL()
			})
			.setDescription(message.content)
			.addBlankFields({ value: `Original Message: ${message.url}`, inline: false })
			.setColor(message.member?.displayColor ?? Colors.White)
			.setTimestamp(message.createdTimestamp);

		// Build the Channel Select
		const channelInput = new ChannelSelectMenuBuilder()
			.setCustomId('cmd-quote-channel-select')
			.setChannelTypes(ChannelType.GuildText)
			.setPlaceholder('Channel to Send Quote');

		const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelInput);

		// Update reply with channel select & buttons
		const response = await interaction.followUp({ content: 'Preview:', embeds: [quoteEmbed], components: [row], fetchReply: true });

		try {
			// Wait for user to click a button
			const confirmation = await response.awaitMessageComponent({ componentType: ComponentType.ChannelSelect, time: 60_000 });

			// User clicked Send
			if (confirmation.customId === 'cmd-quote-channel-select') {

				const targetChannel: TextChannel | undefined = confirmation.channels.first() as TextChannel;

				// Shouldn't be possible, but fail if no targetChannel specified
				if (!targetChannel) {
					await interaction.editReply({ content: 'Whoops... Something went wrong...', components: [], embeds: [] });
					return;
				}

				// Send the quote embed in a new message
				const quoteMessage = await targetChannel.send({ embeds: [quoteEmbed] });
				// Update the interaction message to inform the user
				await interaction.editReply({ content: `Sent! ${quoteMessage.url}`, components: [], embeds: [] });
			}
		} catch (e) {
			// User took too long to send
			await interaction.editReply({ content: 'Interaction Timed Out...', components: [], embeds: [] });
		}

	}
}
