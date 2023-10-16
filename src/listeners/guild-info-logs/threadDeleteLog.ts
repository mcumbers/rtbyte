import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, ChannelType, ThreadChannel, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.ThreadDelete })
export class UserEvent extends Listener {
	public async run(thread: ThreadChannel) {
		if (isNullish(thread.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: thread.guild.id } });
		if (!guildSettingsInfoLogs?.threadDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = thread.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.ThreadDelete, thread.guild, thread);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(thread, auditLogEntry));
	}

	private generateGuildLog(thread: ThreadChannel, auditLogEntry: GuildAuditLogsEntry | null) {
		const threadDescriptor = thread.parent?.type === ChannelType.GuildForum ? 'Post' : 'Thread';
		const parentDescriptor = thread.parent?.type === ChannelType.GuildForum ? 'Forum' : 'Channel';

		const embed = new GuildLogEmbed()
			.setTitle(`${threadDescriptor} Deleted`)
			.setDescription(`${thread.url}`)
			.setThumbnail(thread.guild.iconURL())
			.setFooter({ text: `Thread ID: ${thread.id}` })
			.setType(Events.ThreadDelete);

		if (thread.parent) embed.addFields({ name: `In ${parentDescriptor}`, value: thread.parent.url, inline: true });

		if (thread.ownerId && thread.createdTimestamp) {
			embed.addFields({ name: 'Created By', value: `<@${thread.ownerId}> <t:${Math.round(thread.createdTimestamp as number / 1000)}:R>`, inline: false });
		}
		if (thread.ownerId && !thread.createdTimestamp) {
			embed.addFields({ name: 'Created By', value: `<@${thread.ownerId}>`, inline: false });
		}
		if (!thread.ownerId && thread.createdTimestamp) {
			embed.addFields({ name: 'Created', value: `<t:${Math.round(thread.createdTimestamp as number / 1000)}:R>`, inline: false });
		}

		if (thread.totalMessageSent) embed.addFields({ name: 'Thread Length', value: `${thread.totalMessageSent} Messages`, inline: true });

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
