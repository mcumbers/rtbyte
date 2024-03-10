import { ModActionEditTargetButtonIDPrefix } from '#root/interaction-handlers/modActionEditTargetButton';
import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { isModerator } from '#utils/functions/permissions';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { GuildMember, Message, StringSelectMenuInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override async run(interaction: StringSelectMenuInteraction, modActionID: InteractionHandler.ParseResult<this>) {
		if (!interaction.guild) return;
		await interaction.deferReply({ ephemeral: true });
		if (!interaction.member || !isModerator(interaction.member as GuildMember)) {
			await interaction.message.delete();
			return interaction.followUp({ content: 'Only Moderators can Edit ModActions' });
		}

		const modAction = await this.container.prisma.modAction.fetch(modActionID);
		if (!modAction) return interaction.followUp({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });
		if (modAction.guildID !== interaction.guildId) return interaction.followUp({ content: `No ModAction found with ID ${modActionID}`, ephemeral: true });

		const targetID = interaction.values[0];
		const target = await this.container.client.users.fetch(targetID).catch(() => undefined);

		if (!target) {
			await interaction.message.delete();
			return interaction.followUp({ content: `Could not find User with ID ${targetID}` });
		}

		const updated = await this.container.prisma.modAction.update({ where: { id: modAction.id }, data: { targetID } });
		if (!updated) {
			await interaction.message.delete();
			return interaction.followUp({ content: 'Whoops! Something went wrong...' });
		}

		const embed = await new ModActionLogEmbed().fromModAction(updated);

		if (embed) {
			if (interaction.channel) {
				const messages = interaction.channel?.messages.cache.values();

				let targetMessage: Message | undefined;

				if (messages) {
					for await (const message of messages) {
						if (message.author.id !== this.container.client.id) continue;
						if (!message.components.length) continue;

						for await (const row of message.components) {
							if (targetMessage) break;
							for await (const component of row.components) {
								if (targetMessage) break;
								if (!component.customId || !component.customId.endsWith(`${modAction.id}`)) continue;

								targetMessage = await message.edit({ embeds: [embed] }).catch(() => undefined);
							}
						}
					}
				}

				if (!targetMessage) {
					targetMessage = await interaction.channel.send({ embeds: [embed] }).catch(() => undefined);
				}
			}
		}
		await interaction.message.delete();
		return interaction.followUp({ content: 'ModAction has been updated' });
	}

	public override parse(interaction: StringSelectMenuInteraction) {
		if (!interaction.customId.startsWith(ModActionEditTargetButtonIDPrefix)) return this.none();

		const modActionID = interaction.customId.substring(ModActionEditTargetButtonIDPrefix.length, interaction.customId.length);

		return this.some(parseInt(modActionID, 10));
	}
}
