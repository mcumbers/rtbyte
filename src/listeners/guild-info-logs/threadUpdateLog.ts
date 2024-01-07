import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { seconds } from '#utils/common/times';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, ChannelType, ForumChannel, GuildAuditLogsEntry, ThreadChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.ThreadUpdate })
export class UserEvent extends Listener {
	public async run(oldThread: ThreadChannel, thread: ThreadChannel) {
		if (isNullish(thread.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: thread.guild.id } });
		if (!guildSettingsInfoLogs?.threadUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = thread.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.ThreadUpdate, thread.guild, thread);
		const isForumThread = thread.parent?.type === ChannelType.GuildForum;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(oldThread, thread, auditLogEntry, isForumThread));
	}

	private generateGuildLog(oldThread: ThreadChannel, thread: ThreadChannel, auditLogEntry: GuildAuditLogsEntry | null, isForumThread: boolean) {
		const postOrThread = isForumThread ? 'Post' : 'Thread';
		const embed = new GuildLogEmbed()
			.setAuthor({
				name: thread.name,
				url: `https://discord.com/channels/${thread.guildId}/${thread.id}`,
				iconURL: thread.guild.iconURL() ?? undefined
			})
			.setDescription(inlineCodeBlock(thread.id))
			.setFooter({ text: `${postOrThread} edited ${isNullish(auditLogEntry?.executor) ? '' : `by ${auditLogEntry?.executor.username}`}`, iconURL: isNullish(auditLogEntry?.executor) ? undefined : auditLogEntry?.executor?.displayAvatarURL() })
			.setType(Events.ThreadUpdate);

		if (thread.parent) embed.addFields({ name: `${thread.parent.type === ChannelType.GuildAnnouncement ? 'Announcement' : 'Text'} channel`, value: `<#${thread.parentId}>`, inline: true });
		if (thread.ownerId) embed.addFields({ name: 'Started by', value: `<@${thread.ownerId}>`, inline: true });

		// Name
		if (oldThread.name !== thread.name) {
			embed.addFields({ name: 'Name Changed', value: `\`\`\`diff\n-${oldThread.name}\n+${thread.name}\n\`\`\``, inline: false });
		}

		// Slowmode
		if ((oldThread.rateLimitPerUser || thread.rateLimitPerUser) && (oldThread.rateLimitPerUser !== thread.rateLimitPerUser)) {
			const slowmode = new DurationFormatter().format(seconds(thread.rateLimitPerUser as number));
			const oldSlowmode = new DurationFormatter().format(seconds(oldThread.rateLimitPerUser as number));
			if (!oldThread.rateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Enabled', value: slowmode, inline: true });
			if (!thread.rateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Changed', value: 'Disabled', inline: true });
			if (oldThread.rateLimitPerUser && thread.rateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Changed', value: `\`\`\`diff\n-${oldSlowmode}\n+${slowmode}\n\`\`\``, inline: true });
		}

		// Auto-Archive Duration
		if ((oldThread.autoArchiveDuration || thread.autoArchiveDuration) && (oldThread.autoArchiveDuration !== thread.autoArchiveDuration)) {
			const archiveDuration = new DurationFormatter().format(seconds(thread.autoArchiveDuration as number));
			const oldArchiveDuration = new DurationFormatter().format(seconds(oldThread.autoArchiveDuration as number));
			if (!oldThread.autoArchiveDuration) embed.addFields({ name: 'Auto-Archive Enabled', value: archiveDuration, inline: true });
			if (!thread.autoArchiveDuration) embed.addFields({ name: 'Auto-Archive Changed', value: 'Disabled', inline: true });
			if (oldThread.autoArchiveDuration && thread.autoArchiveDuration) embed.addFields({ name: 'Auto-Archive Changed', value: `\`\`\`diff\n-${oldArchiveDuration}\n+${archiveDuration}\n\`\`\``, inline: true });
		}

		// Tags
		if (thread.parent?.type === ChannelType.GuildForum && oldThread.appliedTags !== thread.appliedTags) {
			const tagDifference = this.getTagDifference(thread.parent, oldThread.appliedTags, thread.appliedTags);
			if (tagDifference.added.length) {
				embed.addFields({ name: 'Tags Added', value: tagDifference.added.join(', ') });
			}
			if (tagDifference.removed.length) {
				embed.addFields({ name: 'Tags Removed', value: tagDifference.removed.join(', ') });
			}
		}

		return [embed];
	}

	private getTagDifference(forumChannel: ForumChannel, oldTag: string[], tag: string[]) {
		const oldTags = forumChannel.availableTags.filter(t => oldTag.includes(t.id));
		const tags = forumChannel.availableTags.filter(t => tag.includes(t.id));
		const added = tags.filter(t => !oldTags.includes(t)).map(t => `${t.emoji ? forumChannel.guild.emojis.resolve(t.emoji.id as string) ?? t.emoji.name : ''} ${inlineCodeBlock(t.name)}`);
		const removed = oldTags.filter(t => !tags.includes(t)).map(t => `${t.emoji ? forumChannel.guild.emojis.resolve(t.emoji.id as string) ?? t.emoji.name : ''} ${inlineCodeBlock(t.name)}`);

		const differences = {
			added,
			removed
		}

		return differences;
	}
}
