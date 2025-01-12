import { CONTROL_GUILD } from '#root/config';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActivityType } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Set the Bot\'s presence',
	preconditions: ['IsDeveloper']
})

export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addNumberOption((option) =>
					option
						.setName('type')
						.setDescription('Presence Type')
						.setRequired(true)
						.setChoices(
							{ name: 'Competing in ...', value: ActivityType.Competing },
							{ name: 'Custom', value: ActivityType.Custom },
							{ name: 'Listening to ...', value: ActivityType.Listening },
							{ name: 'Playing ...', value: ActivityType.Playing },
							{ name: 'Streaming ...', value: ActivityType.Streaming },
							{ name: 'Watching ...', value: ActivityType.Watching }
						)
				)
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('Message to put in the Bot\'s presence')
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default true)')
				)
		}, { guildIds: [CONTROL_GUILD] }
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const startTime = Date.now();

		// Check to see if response should be ephemeral
		const ephemeral = interaction.options.getBoolean('private') ?? true;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });

		const presenceText = interaction.options.getString('message') ?? undefined;
		const presenceType = interaction.options.getNumber('type') ?? 0;

		if (!this.container.client.user) return await interaction.followUp({ content: 'Failed to update ClientUser Presence', ephemeral });

		this.container.client.user.setPresence({
			activities: [{
				name: presenceText || '',
				type: presenceText ? presenceType : ActivityType.Custom
			}]
		});

		message = await interaction.followUp({ content: 'Updated ClientUser Presence', ephemeral });
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
