import { ModActionEditDetailsModalIDPrefix } from '#root/interaction-handlers/modActionEditDetailsModal';
import { isModerator } from '#utils/functions/permissions';
import { ModActionType, type ModAction } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction, type User } from 'discord.js';

export const ModActionEditDetailsButtonIDPrefix = 'btn-maed-';

interface BuildModalOptions {
	reasonLabel: string,
	detailsLabel: string,
	titleGeneric: string,
	titleTargeted: string
}

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;
		if (!interaction.member || !isModerator(interaction.member as GuildMember)) {
			return interaction.reply({ content: 'Only Moderators can Edit ModActions', ephemeral: true });
		}

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		let modal: ModalBuilder | null = null;

		switch (modAction.type) {
			case ModActionType.BAN:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Ban:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Ban Details',
					titleTargeted: 'Edit Ban: '
				});
				break;
			case ModActionType.UNBAN:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Ban Removal:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Unban Details',
					titleTargeted: 'Edit Unban: '
				});
				break;
			case ModActionType.KICK:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Kick:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Kick Details',
					titleTargeted: 'Edit Kick: '
				});
				break;
			case ModActionType.MUTE:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Timeout:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Timeout Details',
					titleTargeted: 'Edit Timeout: '
				});
				break;
			case ModActionType.UNMUTE:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Timeout Removal:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Un-Timeout Details',
					titleTargeted: 'Edit Un-Timeout: '
				});
				break;
			case ModActionType.PURGE:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for Purge:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Purge Details',
					titleTargeted: 'Edit Purge: '
				});
				break;
			case ModActionType.VCBAN:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for VC Ban:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Voice Chat Ban Details',
					titleTargeted: 'Edit Voice Chat Ban: '
				});
				break;
			case ModActionType.VCUNBAN:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for VC Ban Removal:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Voice Chat UnBan Details',
					titleTargeted: 'Edit Voice Chat UnBan: '
				});
				break;
			case ModActionType.VCKICK:
				modal = await this.buildModal(modAction, {
					reasonLabel: 'Reason for VC Kick:',
					detailsLabel: 'Additional Details:',
					titleGeneric: 'Edit Voice Chat Kick Details',
					titleTargeted: 'Edit Voice Chat Kick: '
				});
				break;
			case ModActionType.FILTER_CHAT:
				modal = null;
				break;
			case ModActionType.FILTER_NAME:
				modal = null;
				break;
			case ModActionType.FLAG_SPAMMER_ADD:
				modal = null;
				break;
			case ModActionType.FLAG_SPAMMER_REMOVE:
				modal = null;
				break;
			case ModActionType.FLAG_QUARANTINE_ADD:
				modal = null;
				break;
			case ModActionType.FLAG_QUARANTINE_REMOVE:
				modal = null;
				break;
			default:
				modal = null;
				break;
		}

		if (modal) await interaction.showModal(modal);

		return null;
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith(ModActionEditDetailsButtonIDPrefix)) return this.none();

		const modActionID = interaction.customId.substring(ModActionEditDetailsButtonIDPrefix.length, interaction.customId.length);

		return this.some(parseInt(modActionID, 10));
	}

	private async buildModal(modAction: ModAction, { reasonLabel, detailsLabel, titleGeneric, titleTargeted }: BuildModalOptions) {
		let target: User | undefined;
		if (modAction.targetID) target = await this.container.client.users.fetch(modAction.targetID).catch(() => undefined);

		const reasonField = new TextInputBuilder()
			.setCustomId('reason')
			.setLabel(reasonLabel)
			.setMaxLength(512)
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph);

		if (modAction.reason) reasonField.setValue(modAction.reason);

		const detailsField = new TextInputBuilder()
			.setCustomId('details')
			.setLabel(detailsLabel)
			.setMaxLength(2048)
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph);

		if (modAction.details) detailsField.setValue(modAction.details);

		const modal = new ModalBuilder()
			.setCustomId(`${ModActionEditDetailsModalIDPrefix}${modAction.id}`)
			.setTitle(titleGeneric)
			.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonField))
			.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(detailsField));

		if (target) modal.setTitle(`${titleTargeted}${target.username}`);

		return modal;
	}
}
