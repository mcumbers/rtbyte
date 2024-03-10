import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { isModerator } from '#utils/functions/permissions';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { GuildMember, ModalSubmitInteraction } from 'discord.js';

export const ModActionEditDetailsModalIDPrefix = 'mod-maed-';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public async run(interaction: ModalSubmitInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true });
		if (!interaction.member || !isModerator(interaction.member as GuildMember)) {
			return interaction.editReply({ content: 'Only Moderators can Edit ModActions' });
		}

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.reply({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		const reason = interaction.fields.getTextInputValue('reason');
		const details = interaction.fields.getTextInputValue('details');

		const updated = await this.container.prisma.modAction.update({ where: { id: modAction.id }, data: { reason, details } });
		if (!updated) {
			return interaction.followUp({ content: 'Whoops! Something went wrong...' });
		}

		const embed = await new ModActionLogEmbed().fromModAction(updated);

		if (embed) {
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
