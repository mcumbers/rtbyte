import type { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ModActionEditDetailsButtonIDPrefix } from '#root/interaction-handlers/modActionEditDetailsButton';
import { ModActionEditTargetButtonIDPrefix } from '#root/interaction-handlers/modActionEditTargetButton';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType, type ModAction } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { BaseGuildTextChannel } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const systemModActions: string[] = [ModActionType.FILTER_CHAT, ModActionType.FILTER_NAME, ModActionType.FLAG_SPAMMER_ADD, ModActionType.FLAG_SPAMMER_REMOVE, ModActionType.FLAG_QUARANTINE_ADD, ModActionType.FLAG_QUARANTINE_REMOVE];

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionLogCreate })
export class UserEvent extends Listener {
	public run(modAction: ModAction, logChannel: BaseGuildTextChannel | null, logEmbeds: GuildLogEmbed[] | null, logComponents?: any[]) {
		if (isNullish(logChannel)) return;
		if (!logEmbeds || !logEmbeds.length) return;

		const buttonRow = new ActionRowBuilder<ButtonBuilder>();

		// Edit Details Button
		const editDetailsButton = new ButtonBuilder()
			.setCustomId(`${ModActionEditDetailsButtonIDPrefix}${modAction.id}`)
			.setLabel('Edit Reason/Details')
			.setStyle(modAction.reason ? ButtonStyle.Secondary : ButtonStyle.Primary);

		buttonRow.addComponents(editDetailsButton);

		if (!modAction.targetID) {
			// Add Target Button
			const addTargetButton = new ButtonBuilder()
				.setCustomId(`${ModActionEditTargetButtonIDPrefix}${modAction.id}`)
				.setLabel('Add Target User')
				.setStyle(ButtonStyle.Primary);

			buttonRow.addComponents(addTargetButton);
		}

		if (!modAction.executorID && !systemModActions.includes(modAction.type)) {
			// Add Executor Button
			const addExecutorButton = new ButtonBuilder()
				.setCustomId(`placeholderID-${modAction.id}`)
				.setLabel('Add Moderator')
				.setStyle(ButtonStyle.Primary);

			buttonRow.addComponents(addExecutorButton);
		}

		const components = logComponents ? [...logComponents, buttonRow] : [buttonRow];

		return logChannel.send({ embeds: logEmbeds, components });
	}
}
