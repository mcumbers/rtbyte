import { BotCommand } from '#lib/extensions/BotCommand';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { Prisma } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import type { ChatInputCommand } from '@sapphire/framework';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Check Bot\'s Ping'
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				)
		);
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const startTime = Date.now();
		const ephemeral = interaction.options.getBoolean('private') ?? false;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });

		if (message) {
			const ping = message.createdTimestamp - interaction.createdTimestamp;
			const dbPing = await this.getDBPing(Date.now());
			message = await interaction.editReply(`🏓 Pong! \`Bot: ${ping}ms\` \`Database: ${dbPing}ms\``);
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		message = await interaction.editReply(`Failed to retrieve ping.`);
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, failed: true, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}

	private async getDBPing(startTime = Date.now()) {
		const result = await this.container.prisma._prisma.$queryRaw(Prisma.sql`SELECT 1`);
		return result ? Date.now() - startTime : null;
	}
}
