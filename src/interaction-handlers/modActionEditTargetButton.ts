import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { isModerator } from '#utils/functions/permissions';
import { ModActionType, type ModAction } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, GuildMember, UserSelectMenuBuilder, type ButtonInteraction, type User } from 'discord.js';

export const ModActionEditTargetButtonIDPrefix = 'btn-maet-';

interface BuildSelectOptions {
	title: string
}

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		await interaction.deferReply({ ephemeral: true });

		if (!interaction.guild) return interaction.followUp({ content: 'You can only edit ModActions in Servers', ephemeral: true });
		if (!interaction.member || !isModerator(interaction.member as GuildMember)) {
			return interaction.followUp({ content: 'Only Moderators can Edit ModActions', ephemeral: true });
		}

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		let targetUserSelect: UserSelectMenuBuilder | null = null;

		switch (modAction.type) {
			case ModActionType.BAN:
				targetUserSelect = null;
				break;
			case ModActionType.UNBAN:
				targetUserSelect = null;
				break;
			case ModActionType.KICK:
				targetUserSelect = null;
				break;
			case ModActionType.MUTE:
				targetUserSelect = null;
				break;
			case ModActionType.UNMUTE:
				targetUserSelect = null;
				break;
			case ModActionType.PURGE:
				targetUserSelect = await this.buildSelect(modAction, {
					title: 'Purged User'
				});
				break;
			case ModActionType.VCBAN:
				targetUserSelect = null;
				break;
			case ModActionType.VCUNBAN:
				targetUserSelect = null;
				break;
			case ModActionType.VCKICK:
				targetUserSelect = null;
				break;
			case ModActionType.FILTER_CHAT:
				targetUserSelect = null;
				break;
			case ModActionType.FILTER_NAME:
				targetUserSelect = null;
				break;
			case ModActionType.FLAG_SPAMMER_ADD:
				targetUserSelect = null;
				break;
			case ModActionType.FLAG_SPAMMER_REMOVE:
				targetUserSelect = null;
				break;
			case ModActionType.FLAG_QUARANTINE_ADD:
				targetUserSelect = null;
				break;
			case ModActionType.FLAG_QUARANTINE_REMOVE:
				targetUserSelect = null;
				break;
			default:
				targetUserSelect = null;
				break;
		}

		if (!targetUserSelect) return interaction.reply({ content: 'Failed to build TargetUserSelect' });

		const embed = await new ModActionLogEmbed().fromModAction(modAction);
		const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(targetUserSelect);
		await interaction.followUp({ embeds: embed ? [embed] : undefined, components: [row] });

		return null;
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith(ModActionEditTargetButtonIDPrefix)) return this.none();

		const modActionID = interaction.customId.substring(ModActionEditTargetButtonIDPrefix.length, interaction.customId.length);

		return this.some(parseInt(modActionID, 10));
	}

	private async buildSelect(modAction: ModAction, { title }: BuildSelectOptions) {
		let target: User | undefined;
		if (modAction.targetID) target = await this.container.client.users.fetch(modAction.targetID).catch(() => undefined);

		const targetUserSelect = new UserSelectMenuBuilder()
			.setCustomId('targetID')
			.setPlaceholder(title)
			.setMinValues(1)
			.setMaxValues(1);

		if (target) {
			targetUserSelect.setDefaultUsers(target.id);
		}

		return targetUserSelect;
	}
}
