import { BotCommand } from '#lib/extensions/BotCommand';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand } from '@sapphire/framework';
import { PermissionFlagsBits, type GuildMember } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Sends a message to the specified channel as the bot',
	preconditions: ['IsModerator']
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.setDMPermission(false)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel to send a message to')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('The message you want to send')
						.setRequired(true)
				));
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const startTime = Date.now();
		let message = await interaction.deferReply({ ephemeral: true, fetchReply: true });

		const targetChannel = interaction.guild?.channels.resolve(interaction.options.getChannel('channel')?.id as string);
		const messageInput = interaction.options.getString('message') as string;

		if (!targetChannel) {
			message = await interaction.followUp({ content: `Whoops! Something went wrong...` });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
		}

		if (!targetChannel?.isTextBased()) {
			message = await interaction.followUp({ content: `Messages cannot be sent to ${targetChannel?.url}` });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		if (!targetChannel.permissionsFor(interaction.member as GuildMember).has(PermissionFlagsBits.SendMessages)) {
			message = await interaction.followUp({ content: `You don't have permission to send messages in ${targetChannel.url}`, components: [], embeds: [] });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const sentMessage = await targetChannel.send({ content: messageInput });
		message = await interaction.followUp({ content: `Sent Message: ${sentMessage.url}` });
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
