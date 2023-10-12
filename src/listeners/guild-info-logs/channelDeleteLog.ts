import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor, getChannelDescriptor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildChannel, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.ChannelDelete })
export class UserEvent extends Listener {
	public async run(channel: GuildChannel) {
		if (isNullish(channel.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: channel.guild.id } });
		if (!guildSettingsInfoLogs?.channelDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = channel.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.ChannelDelete, channel.guild, channel);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(channel, executor));
	}

	private generateGuildLog(channel: GuildChannel, executor: User | null | undefined) {
		const channelDescriptor = getChannelDescriptor(channel.type);

		const embed = new GuildLogEmbed()
			.setTitle(`${channelDescriptor} Deleted`)
			.setDescription(channel.name)
			.setThumbnail(channel.guild.iconURL())
			.setFooter({ text: `Channel ID: ${channel.id}` })
			.setType(Events.ChannelDelete);

		if (channel.parent) embed.addFields({ name: 'In Category', value: channel.parent.name, inline: true });

		if (channel.createdTimestamp) embed.addFields({ name: 'Created', value: `<t:${Math.round(channel.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (!isNullish(executor)) embed.addFields({ name: 'Deleted By', value: executor.toString(), inline: true });

		return [embed]
	}
}
