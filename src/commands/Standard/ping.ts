import { BotCommand } from '#lib/extensions/BotCommand';
import { Emojis } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { isMessageInstance } from '@sapphire/discord.js-utilities';
import { type ChatInputCommand } from '@sapphire/framework';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Pings bot'
})
export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const msg = await interaction.deferReply({ ephemeral: true, fetchReply: true });

		if (isMessageInstance(msg)) {
			const diff = msg.createdTimestamp - interaction.createdTimestamp;
			const ping = Math.round(this.container.client.ws.ping);
			return interaction.editReply(`${Emojis.Check} Pong! \`Bot: ${diff}ms\` \`API: ${ping}ms\``);
		}

		return interaction.editReply(`${Emojis.X} Failed to retrieve ping.`);
	}
}