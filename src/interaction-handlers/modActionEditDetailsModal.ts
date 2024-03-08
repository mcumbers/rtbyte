import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction } from 'discord.js';

export const ModActionEditDetailsModalIDPrefix = 'mod-maed-';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public async run(interaction: ModalSubmitInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;

		await interaction.deferReply({ ephemeral: true });

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		const reason = interaction.fields.getTextInputValue('reason');
		const details = interaction.fields.getTextInputValue('details');

		const updated = await this.container.prisma.modAction.update({ where: { id: modAction.id }, data: { reason, details } });
		if (!updated) {
			return interaction.followUp({ content: 'Whoops! Something went wrong...' });
		}

		const embed = interaction.message?.embeds[0];

		if (embed) {
			const reasonEmbedFieldIndex = embed.fields.findIndex((field) => field.name === 'Reason');
			if (reasonEmbedFieldIndex >= 0) {
				const reasonEmbedField = embed.fields[reasonEmbedFieldIndex];
				reasonEmbedField.value = updated.reason ?? 'N/A';
				embed.fields[reasonEmbedFieldIndex] = reasonEmbedField;
			} else {
				embed.fields.push({ name: 'Reason', value: updated.reason ?? 'N/A' });
			}

			const detailsEmbedFieldIndex = embed.fields.findIndex((field) => field.name === 'Details');
			if (detailsEmbedFieldIndex >= 0) {
				const detailsEmbedField = embed.fields[detailsEmbedFieldIndex];
				detailsEmbedField.value = updated.details ?? 'N/A';
				embed.fields[detailsEmbedFieldIndex] = detailsEmbedField;
			} else {
				embed.fields.push({ name: 'Details', value: updated.details ?? 'N/A' });
			}

			await interaction.message?.edit({ content: '', embeds: [embed] });
		}

		return interaction.followUp({ content: 'ModAction has been updated' });
	}

	public override parse(interaction: ModalSubmitInteraction) {
		if (!interaction.customId.startsWith(ModActionEditDetailsModalIDPrefix)) return this.none();

		const modActionID = interaction.customId.substring(ModActionEditDetailsModalIDPrefix.length, interaction.customId.length);

		return this.some(parseInt(modActionID, 10));
	}
}
