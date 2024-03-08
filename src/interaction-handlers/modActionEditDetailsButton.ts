import { ModActionEditDetailsModalIDPrefix } from '#root/interaction-handlers/modActionEditDetailsModal';
import { ModActionType, type ModAction } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, Guild, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, type ButtonInteraction } from 'discord.js';

export const ModActionEditDetailsButtonIDPrefix = 'btn-maed-';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public async run(interaction: ButtonInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;

		// Permissions?

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		let modal: ModalBuilder | null = null;

		switch (modAction.type) {
			case ModActionType.BAN:
				modal = null;
				break;
			case ModActionType.UNBAN:
				modal = null;
				break;
			case ModActionType.KICK:
				modal = null;
				break;
			case ModActionType.MUTE:
				modal = await this.buildTimeoutModal(interaction.guild, modAction);
				break;
			case ModActionType.UNMUTE:
				modal = null;
				break;
			case ModActionType.PURGE:
				modal = null;
				break;
			case ModActionType.VCBAN:
				modal = null;
				break;
			case ModActionType.VCUNBAN:
				modal = null;
				break;
			case ModActionType.VCKICK:
				modal = null;
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
		}

		if (modal) await interaction.showModal(modal);

		return null;
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith(ModActionEditDetailsButtonIDPrefix)) return this.none();

		const modActionID = interaction.customId.substring(ModActionEditDetailsButtonIDPrefix.length, interaction.customId.length);

		return this.some(parseInt(modActionID, 10));
	}

	private async buildTimeoutModal(guild: Guild, modAction: ModAction) {
		let member: GuildMember | null = null;
		if (modAction.targetID) member = await guild.members.fetch(modAction.targetID).catch(null);

		const reasonField = new TextInputBuilder()
			.setCustomId('reason')
			.setLabel("Reason for Timeout:")
			.setMaxLength(512)
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph);

		if (modAction.reason) reasonField.setValue(modAction.reason);

		const detailsField = new TextInputBuilder()
			.setCustomId('details')
			.setLabel("Additional Details:")
			.setMaxLength(2048)
			.setRequired(false)
			.setStyle(TextInputStyle.Paragraph);

		if (modAction.details) detailsField.setValue(modAction.details);

		const modal = new ModalBuilder()
			.setCustomId(`${ModActionEditDetailsModalIDPrefix}${modAction.id}`)
			.setTitle('Edit Timeout Details')
			.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonField))
			.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(detailsField));

		if (member && member.displayName) modal.setTitle(`Edit Timeout: ${member.displayName}`);

		return modal;
	}
}
