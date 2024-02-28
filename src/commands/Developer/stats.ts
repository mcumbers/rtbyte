import { BotEmbed } from '#lib/extensions/BotEmbed';
import { CONTROL_GUILD } from '#root/config';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { memoryUsage } from 'node:process';

@ApplyOptions<Command.Options>({
	description: 'See statistics about the Bot.',
	preconditions: ['DevOnly']
})

export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				)
		}, { guildIds: [CONTROL_GUILD] }
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const startTime = Date.now();
		// Check to see if response should be ephemeral
		const ephemeral = interaction.options.getBoolean('private') ?? false;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });

		// How many Guilds the bot is in
		const guildCount = this.container.client.guilds.cache.size;

		// Combined number of users of all guilds the bot is in
		let memberCount = 0;
		let guildAppCommandCount = 0;
		for await (const guild of this.container.client.guilds.cache) {
			memberCount += guild[1].memberCount;
			const guildCommands = await guild[1].commands.fetch();
			guildAppCommandCount += guildCommands.size;
		}

		// Counts for both global and guild-specific application commands
		let globalAppCommandCount = 0;
		for await (const appCommand of this.container.client.application?.commands.cache ?? []) {
			if (appCommand) globalAppCommandCount++;
		}

		// Memory usage on host machine for this process
		const { heapTotal } = memoryUsage();
		const megabytesUsed = (heapTotal / 1000000).toFixed(2);

		const botGlobalSettings = await this.container.prisma.botGlobalSettings.fetch(this.container.client.id as string);
		const lastRestart: Date = botGlobalSettings?.restarts[botGlobalSettings.restarts.length - 1] ?? new Date();

		// Build reply embed
		const embed = new BotEmbed()
			.setTitle(`${this.container.client.user?.username} Stats`)
			.setThumbnail(this.container.client.user?.avatarURL() ?? null)
			.addFields({ name: 'Guilds', value: `${guildCount}`, inline: true })
			.addFields({ name: 'Members', value: `${memberCount}`, inline: true })
			.addBlankFields({ inline: true })
			.addFields({ name: 'Memory Use', value: `${megabytesUsed}MB`, inline: true })
			.addFields({ name: 'Last Restart', value: `<t:${Math.trunc(lastRestart.getTime() / 1000)}>`, inline: true })
			.addBlankFields({ inline: true })
			.addFields({ name: 'Global Commands', value: `${globalAppCommandCount}`, inline: true })
			.addFields({ name: 'Guild Commands', value: `${guildAppCommandCount}`, inline: true });

		message = await interaction.followUp({ content: '', embeds: [embed], ephemeral });
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
