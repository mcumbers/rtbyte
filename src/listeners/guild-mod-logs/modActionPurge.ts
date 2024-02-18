import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import type { ModActionPurgeEvent } from '#root/commands/Moderation/purge';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: 'modActionPurge' })
export class UserEvent extends Listener {
	public async run(purge: ModActionPurgeEvent) {

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.findUnique({ where: { id: purge.guild.id } });
		if (!guildSettingsModActions || !guildSettingsModActions.purgeLog && !guildSettingsModActions.purgeLogPublic) return;

		const logChannel: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannel ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel : null;
		const logChannelPublic: BaseGuildTextChannel | null = guildSettingsModActions.modLogChannelPublic ? purge.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel : null;

		if (logChannel) this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(purge));
		if (logChannelPublic) this.container.client.emit('guildLogCreate', logChannelPublic, this.generateGuildLog(purge));
	}

	private generateGuildLog(purge: ModActionPurgeEvent) {
		const embed = new GuildLogEmbed()
			.setTitle('Messages Purged')
			.setDescription(`${purge.messagesCount} Messages ${purge.targetUser ? `from ${purge.targetUser.toString()}` : ''}Deleted.`)
			.setThumbnail(purge.guild.iconURL())
			.setFooter({ text: `Interaction ID: ${purge.id}` })
			.setType(Events.MessageDelete)
			.addBlankFields({ name: 'In Channel', value: purge.channel.url, inline: false });

		if (purge.reason) embed.addFields({ name: 'Reason', value: purge.reason, inline: false });
		if (purge.executor) embed.addFields({ name: 'Purged By', value: purge.executor.toString(), inline: false });

		return [embed];
	}
}
