import { BotCommand } from '#lib/extensions/BotCommand';
import { BotEmbed } from '#lib/extensions/BotEmbed';
import { Colors } from "#utils/constants";
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, type ContextMenuCommand } from '@sapphire/framework';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Quote a message'
})
export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerContextMenuCommand((builder) =>
			builder
				.setName('Quote')
				.setType(ApplicationCommandType.Message)
				.setDefaultMemberPermissions(PermissionFlagsBits.ReadMessageHistory));
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription('To quote a message, right click it, then click Apps > Quote'));
	}

	public async contextMenuRun(interaction: ContextMenuCommand.Interaction) {
		await interaction.deferReply({ ephemeral: false, fetchReply: true });

		if (interaction.isMessageContextMenuCommand() && interaction.targetMessage) {

			const message = interaction.targetMessage;
			const embed = new BotEmbed()
				.setAuthor({
					name: message.author.username,
					url: `https://discord.com/users/${message.author.id}`,
					iconURL: message.author.displayAvatarURL()
				})
				.setDescription(message.content)
				.setColor(message.member?.displayColor ?? Colors.White)
				.setTimestamp(message.createdTimestamp);


			await interaction.followUp({ embeds: [embed] });
		}
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		return interaction.reply({ content: 'ℹ️ To quote a message, right click it, then click **Apps** > **Quote**.', ephemeral: true });
	}
}