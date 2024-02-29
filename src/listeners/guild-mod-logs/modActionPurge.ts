import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import type { ModActionPurgeEvent } from '#root/commands/Moderation/purge';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionPurge })
export class UserEvent extends Listener {
	public async run(purge: ModActionPurgeEvent) {
		const { guild, targetUser, executor } = purge;

		// Log ModAction
		await this.container.prisma._prisma.modAction.create({
			data: {
				guildID: guild.id,
				type: ModActionType.PURGE,
				targetID: targetUser?.id,
				executorID: executor.id,
				createdAt: purge.createdAt,
				reason: purge.reason
			}
		});

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(purge.guild.id);
		if (!guildSettingsModActions || !guildSettingsModActions.purgeLog && !guildSettingsModActions.purgeLogPublic) return;

		const logChannel: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannel ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel : null;
		const logChannelPublic: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannelPublic ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel : null;

		if (logChannel) this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(purge));
		if (logChannelPublic) this.container.client.emit(CustomEvents.GuildLogCreate, logChannelPublic, this.generateGuildLog(purge));
	}

	private generateGuildLog(purge: ModActionPurgeEvent) {
		const embed = new GuildLogEmbed()
			.setTitle('Messages Purged')
			.setDescription(`${purge.messagesCount} Messages ${purge.targetUser ? `from ${purge.targetUser.toString()} ` : ''}Deleted`)
			.setThumbnail(purge.targetUser ? purge.targetUser.avatarURL() : purge.guild.iconURL())
			.setFooter({ text: `Interaction ID: ${purge.id}` })
			.setType(Events.MessageDelete)
			.addBlankFields({ name: 'In Channel', value: purge.channel.url, inline: false });

		if (purge.reason) embed.addFields({ name: 'Reason', value: purge.reason, inline: false });
		if (purge.executor) embed.addFields({ name: 'Deleted By', value: purge.executor.toString(), inline: false });

		return [embed];
	}
}
