import type { ModActionPurgeEvent } from '#root/commands/Moderation/purge';
import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionPurge })
export class UserEvent extends Listener {
	public async run(purge: ModActionPurgeEvent) {
		const { guild, targetUser, executor } = purge;

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: guild.id,
				type: ModActionType.PURGE,
				targetID: targetUser?.id,
				executorID: executor.id,
				createdAt: purge.createdAt,
				reason: purge.reason,
				messageCount: purge.messagesCount,
				channelID: purge.channel.id
			}
		});

		if (!modAction) {
			// Something's up--we couldn't create this ModAction
			return;
		}

		const embed = await new ModActionLogEmbed().fromModAction(modAction);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(purge.guild.id);
		if (!guildSettingsModActions || !guildSettingsModActions.purgeLog && !guildSettingsModActions.purgeLogPublic) return;

		const logChannel: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannel ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel : null;
		const logChannelPublic: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannelPublic ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel : null;

		if (logChannel) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, logChannel, embed);
		if (logChannelPublic) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, logChannelPublic, embed);
	}

}
