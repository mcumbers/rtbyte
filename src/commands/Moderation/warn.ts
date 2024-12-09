import { BotCommand } from '#lib/extensions/BotCommand';
import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Give User a Warning',
	preconditions: ['IsModerator']
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setDMPermission(false)
				.addUserOption((option) =>
					option
						.setName('member')
						.setDescription('The member being given a Warning')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('reason')
						.setDescription('Reason the member is being Warned')
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('anonymous')
						.setDescription('Whether or not the member should be shown who issued the Warning')
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

		const anonymous = interaction.options.getBoolean('anonymous') ?? false;

		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: member.guild.id,
				type: ModActionType.WARN,
				targetID: member.id,
				executorID: interaction.user.id,
				createdAt: new Date(),
				reason: interaction.options.getString('reason'),
				anonymous
			}
		});

		if (!modAction) {
			// Something went wrong--we couldn't create the ModAction...
			return interaction.followUp({ content: 'Something went wrong... I couldn\'t create the modAction!' });
		}

		this.container.client.emit(CustomEvents.ModActionWarn, { member, modAction });

		const modActionEmbedTarget = await new ModActionLogEmbed().fromModAction(modAction, 'Target');

		if (!modActionEmbedTarget) {
			// Something went wrong--we couldn't create the Embed...
			return interaction.followUp({ content: 'Something went wrong... modAction was created, but I couldn\'t create a log!' });
		}

		const targetUser = await this.container.client.users.fetch(member.id).catch(() => undefined);

		if (!targetUser) {
			// Something went wrong--we couldn't fetch the User...
			return interaction.followUp({ content: 'Something went wrong... modAction was created, but I couldn\'t send it to the User!', embeds: [modActionEmbedTarget] });
		}

		const targetMessage = await targetUser.send({ embeds: [modActionEmbedTarget] });

		if (!targetMessage) {
			// Something went wrong--we couldn't send the Warning to the Target
			return interaction.followUp({ content: 'Something went wrong... modAction was created, but I couldn\'t send it to the User!', embeds: [modActionEmbedTarget] });
		}

		await interaction.followUp({ content: 'User has received this Warning:', embeds: [modActionEmbedTarget] });

		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
