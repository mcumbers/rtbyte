import { BotCommand } from '#lib/extensions/BotCommand';
import { Colors } from '#root/lib/util/constants';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { type ChatInputCommand } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Retrieve moderation history of a user',
	preconditions: ['IsModerator']
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.addUserOption((option) =>
					option
						.setName('member')
						.setDescription('The member to fetch history for')
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default true)')
				));
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const startTime = Date.now();
		const ephemeral = interaction.options.getBoolean('private') ?? true;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });

		const member = interaction.guild?.members.resolve(interaction.options.getUser('member')?.id as string);
		if (!member) {
			message = await interaction.followUp({ content: 'Unable to fetch information for the specified member, please try again later.' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const modHistory = await this.container.prisma.modAction.findMany({ where: { targetID: member.id, guildID: member.guild.id } });

		if (!modHistory || !modHistory.length) {
			message = await interaction.followUp({ content: `${member.toString()} has no Moderation History.` });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		message = await interaction.followUp({ content: `Loading History of ${member.toString()}...` });

		const paginatedMessage = new PaginatedMessage();

		for (const modAction of modHistory.reverse()) {
			// PaginatedMessage only supports up to 25 pages currently
			// TODO: Might find a way to go beyond 25 pages?
			// TODO: I'd like to build better embeds for this, but quick-n-dirty is good enough for now
			if (paginatedMessage.pages.length >= 25) break;
			paginatedMessage.addPageEmbed((embed) => embed
				.setTitle(modAction.type)
				.setTimestamp(new Date(modAction.createdAt))
				.setColor(modAction.type === "UNBAN" || modAction.type === "UNMUTE" || modAction.type === "WARN" ? Colors.Yellow : Colors.Red)
				.addFields({ name: 'Reason', value: modAction.reason ?? 'N/A' })
				.addFields({ name: 'Moderator', value: modAction.executorID ? `<@${modAction.executorID}>` : 'N/A' })
			);
		}

		this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		return await paginatedMessage.run(interaction);
	}
}
