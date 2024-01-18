import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { minutes, seconds } from '#utils/common/times';
import { getPermissionDifference } from '#utils/functions/permissions';
import { getAuditLogEntry, getChannelDescriptor, getRegionOverride } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, CategoryChannel, ChannelType, ForumChannel, NewsChannel, OverwriteType, PermissionsBitField, StageChannel, TextChannel, VoiceChannel, type GuildAuditLogsEntry } from 'discord.js';

type GuildBasedChannel = CategoryChannel | NewsChannel | StageChannel | TextChannel | VoiceChannel | ForumChannel

@ApplyOptions<ListenerOptions>({ event: Events.ChannelUpdate })
export class UserEvent extends Listener {
	public async run(oldChannel: GuildBasedChannel, channel: GuildBasedChannel) {
		if (isNullish(channel.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: channel.guild.id } });
		if (!guildSettingsInfoLogs?.channelUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = channel.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.ChannelUpdate, channel.guild, channel);

		return this.container.client.emit('guildLogCreate', logChannel, await this.generateGuildLog(oldChannel, channel, auditLogEntry));
	}

	private async generateGuildLog(oldChannel: GuildBasedChannel, channel: GuildBasedChannel, auditLogEntry: GuildAuditLogsEntry | null) {
		const channelDescriptor = getChannelDescriptor(channel.type);

		const embed = new GuildLogEmbed()
			.setTitle(`${channelDescriptor} Updated`)
			.setDescription(channel.url)
			.setThumbnail(channel.guild.iconURL())
			.setFooter({ text: `Channel ID: ${channel.id}` })
			.setType(Events.ChannelUpdate);

		if (oldChannel.name !== channel.name) {
			embed.addFields({ name: 'Name Changed', value: `\`\`\`diff\n-${oldChannel.name}\n+${channel.name}\n\`\`\``, inline: false });
		}

		if (oldChannel.parent !== channel.parent) {
			embed.addFields({ name: 'Category Changed', value: `\`\`\`diff\n-${oldChannel.parent?.name}\n+${channel.parent?.name}\n\`\`\``, inline: false });
		}

		if (oldChannel.type !== channel.type) {
			embed.addFields({ name: 'Channel Type Changed', value: channel.type === ChannelType.GuildAnnouncement ? 'Announcement Channel' : 'Regular Channel', inline: true });
		}

		// Categories don't have these, but all other types do
		if (oldChannel.type !== ChannelType.GuildCategory && channel.type !== ChannelType.GuildCategory) {
			// NSFW Status
			if (oldChannel.nsfw !== channel.nsfw) {
				embed.addFields({ name: 'Channel Type Changed', value: channel.nsfw ? 'NSFW Channel' : 'non-NSFW Channel', inline: true });
			}

			// Slowmode
			if ((oldChannel.rateLimitPerUser || channel.rateLimitPerUser) && (oldChannel.rateLimitPerUser !== channel.rateLimitPerUser)) {
				const slowmode = new DurationFormatter().format(seconds(channel.rateLimitPerUser as number));
				const oldSlowmode = new DurationFormatter().format(seconds(oldChannel.rateLimitPerUser as number));
				if (!oldChannel.rateLimitPerUser) embed.addFields({ name: 'Slow Mode Enabled', value: slowmode, inline: true });
				if (!channel.rateLimitPerUser) embed.addFields({ name: 'Slow Mode Changed', value: 'Disabled', inline: true });
				if (oldChannel.rateLimitPerUser && channel.rateLimitPerUser) embed.addFields({ name: 'Slow Mode Changed', value: `\`\`\`diff\n-${oldSlowmode}\n+${slowmode}\n\`\`\``, inline: true });
			}

		}

		// Text & Forum Checks
		if ((oldChannel.type === ChannelType.GuildForum && channel.type === ChannelType.GuildForum) || (oldChannel.type === ChannelType.GuildText && channel.type === ChannelType.GuildText)) {
			// Topic Changes
			if (oldChannel.topic !== channel.topic) {
				if (!oldChannel.topic) embed.addFields({ name: 'Topic Added', value: channel.topic as string, inline: true });
				if (!channel.topic) embed.addFields({ name: 'Topic Removed', value: oldChannel.topic as string, inline: true });
				if (oldChannel.topic && channel.topic) embed.addFields({ name: 'Topic Changed', value: `\`\`\`diff\n-${oldChannel.topic}\n+${channel.topic}\n\`\`\``, inline: false });
			}

			// Default Thread Auto-Archive Duration
			if (oldChannel.defaultAutoArchiveDuration !== channel.defaultAutoArchiveDuration) {
				embed.addFields({ name: 'Thread Archive Time Changed', value: `${new DurationFormatter().format(minutes(channel.defaultAutoArchiveDuration ?? 4320))}`, inline: true });
			}

			// Forum Checks
			if (oldChannel.type === ChannelType.GuildForum && channel.type === ChannelType.GuildForum) {
				const forumLayout = ['Not set', 'List view', 'Gallery view'];
				const sortOrder = ['Recent activity', 'Creation time'];

				// Forum Tags
				if (oldChannel.availableTags !== channel.availableTags) {
					const addedTags = channel.availableTags.filter((tag) => !oldChannel.availableTags.find((oldTag) => oldTag.id === tag.id));
					const removedTags = oldChannel.availableTags.filter((tag) => !channel.availableTags.find((oldTag) => oldTag.id === tag.id));
					const changedTags = channel.availableTags.filter((tag) => {
						const oldTag = oldChannel.availableTags.find((oldTag) => oldTag.id === tag.id);
						if (!oldTag) return false;
						if (oldTag === tag) return false;
						return true;
					});

					if (addedTags.length) {
						for (const tag of addedTags) {
							const tagType = tag.moderated ? 'Mod-Only Tag' : 'Tag';
							const emojiString = tag.emoji?.id ? (await channel.guild.emojis.fetch(tag.emoji.id)).toString() : tag.emoji?.name ? `${tag.emoji.name}` : '';
							embed.addFields({ name: `${tagType} Created`, value: `${emojiString} **${tag.name}**`, inline: true });
						}
					}

					if (removedTags.length) {
						for (const tag of removedTags) {
							const tagType = tag.moderated ? 'Mod-Only Tag' : 'Tag';
							const emojiString = tag.emoji?.id ? (await channel.guild.emojis.fetch(tag.emoji.id)).toString() : tag.emoji?.name ? `${tag.emoji.name}` : '';
							embed.addFields({ name: `${tagType} Deleted`, value: `${emojiString} **${tag.name}**`, inline: true });
						}
					}

					if (changedTags.length) {
						for (const tag of changedTags) {
							const tagType = tag.moderated ? 'Mod-Only Tag' : 'Tag';
							const emojiString = tag.emoji?.id ? (await channel.guild.emojis.fetch(tag.emoji.id)).toString() : tag.emoji?.name ? `${tag.emoji.name}` : '';

							const oldTag = oldChannel.availableTags.find((oldTag) => oldTag.id === tag.id);
							if (!oldTag) continue;
							const oldTagType = oldTag.moderated ? 'Mod-Only Tag' : 'Tag';
							const oldEmojiString = oldTag.emoji?.id ? (await channel.guild.emojis.fetch(oldTag.emoji.id)).toString() : oldTag.emoji?.name ? `${oldTag.emoji.name}` : '';

							const lines = [];

							if (oldTag.name !== tag.name) {
								lines.push(`~~~ Tag Name Changed ~~~\n-${oldTag.name}\n+${tag.name}`);
							}

							if (oldTagType !== tagType) {
								lines.push(`~~~ Tag Type Changed ~~~\n-${oldTagType}\n+${tagType}`);
							}

							if (oldEmojiString !== emojiString) {
								lines.push(`~~~ Tag Emoji Changed ~~~\n-${oldEmojiString}\n+${emojiString}`);
							}

							if (lines.length) embed.addFields({ name: `${tagType} Edited`, value: `${emojiString} **${tag.name}**\n\`\`\`diff\n${lines.join('\n')}\n\`\`\``, inline: true });
						}
					}
				}

				// Default Reaction Emoji
				if (oldChannel.defaultReactionEmoji?.id !== channel.defaultReactionEmoji?.id) {
					const oldEmoji = oldChannel.defaultReactionEmoji ? oldChannel.guild.emojis.resolve(oldChannel.defaultReactionEmoji.id as string) : null;
					const emoji = channel.defaultReactionEmoji ? channel.guild.emojis.resolve(channel.defaultReactionEmoji.id as string) : null;
					if (!oldEmoji) embed.addFields({ name: 'Default Reaction Added', value: `${emoji?.toString()}`, inline: true });
					if (!emoji) embed.addFields({ name: 'Default Reaction Removed', value: `${oldEmoji?.toString()}`, inline: true });
					if (oldEmoji && emoji) embed.addFields({ name: 'Default Reaction Changed', value: `${oldEmoji?.toString()} -> ${emoji?.toString()}`, inline: true });
				}

				// Default Thread Slowmode
				if ((oldChannel.defaultThreadRateLimitPerUser || channel.defaultThreadRateLimitPerUser) && (oldChannel.defaultThreadRateLimitPerUser !== channel.defaultThreadRateLimitPerUser)) {
					const slowmode = new DurationFormatter().format(seconds(channel.defaultThreadRateLimitPerUser as number));
					const oldSlowmode = new DurationFormatter().format(seconds(oldChannel.defaultThreadRateLimitPerUser as number));
					if (!oldChannel.defaultThreadRateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Enabled', value: slowmode, inline: true });
					if (!channel.defaultThreadRateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Changed', value: 'Disabled', inline: true });
					if (oldChannel.defaultThreadRateLimitPerUser && channel.defaultThreadRateLimitPerUser) embed.addFields({ name: 'Message Slow Mode Changed', value: `\`\`\`diff\n-${oldSlowmode}\n+${slowmode}\n\`\`\``, inline: true });
				}

				// Layout
				if (oldChannel.defaultForumLayout !== channel.defaultForumLayout) {
					embed.addFields({ name: 'Default Layout Changed', value: `${forumLayout[oldChannel.defaultForumLayout]} -> ${forumLayout[channel.defaultForumLayout]}`, inline: true });
				}

				// Sort Order
				if (oldChannel.defaultSortOrder !== channel.defaultSortOrder) {
					if (oldChannel.defaultSortOrder === null) embed.addFields({ name: 'Default Sort Order Added', value: `${sortOrder[channel.defaultSortOrder as number]}`, inline: true });
					if (channel.defaultSortOrder === null) embed.addFields({ name: 'Default Sort Order Removed', value: `${sortOrder[oldChannel.defaultSortOrder as number]}`, inline: true });
					if (oldChannel.defaultSortOrder !== null && channel.defaultSortOrder !== null) embed.addFields({ name: 'Default Sort Order Changed', value: `${sortOrder[oldChannel.defaultSortOrder]} -> ${sortOrder[channel.defaultSortOrder]}`, inline: true });
				}
			}
		}

		// Voice & Stage Checks
		if ((oldChannel.type === ChannelType.GuildVoice && channel.type === ChannelType.GuildVoice) || (oldChannel.type === ChannelType.GuildStageVoice && channel.type === ChannelType.GuildStageVoice)) {
			const videoQualityMode = ['', 'Auto', '720p'];

			// Bitrate
			if (oldChannel.bitrate !== channel.bitrate) {
				embed.addFields({ name: 'Bitrate Changed', value: `\`\`\`diff\n-${oldChannel.bitrate / 1000}kbps\n+${channel.bitrate / 1000}kbps\n\`\`\``, inline: false });
			}

			// Video Quality
			if ((oldChannel.videoQualityMode || channel.videoQualityMode) && (oldChannel.videoQualityMode !== channel.videoQualityMode)) {
				embed.addFields({ name: 'Video Quality Changed', value: `\`\`\`diff\n-${videoQualityMode[oldChannel.videoQualityMode as number]}\n+${videoQualityMode[channel.videoQualityMode as number]}\n\`\`\``, inline: false });
			}

			// User Limit
			if (oldChannel.userLimit !== channel.userLimit) {
				embed.addFields({ name: 'User Limit Changed', value: `\`\`\`diff\n-${oldChannel.userLimit}\n+${channel.userLimit}\n\`\`\``, inline: false });
			}

			// Region Override
			if (oldChannel.rtcRegion !== channel.rtcRegion) {
				embed.addFields({ name: 'Region Override Changed', value: `\`\`\`diff\n-${getRegionOverride(oldChannel)}\n+${getRegionOverride(channel)}\n\`\`\``, inline: false });
			}
		}

		// Check if permissions sync'd to category
		if ((oldChannel.parent || channel.parent) && (oldChannel.permissionsLocked !== channel.permissionsLocked)) {
			embed.addFields({ name: 'Permissions', value: channel.permissionsLocked ? 'Synchronized with Category' : 'Out of Sync with Category', inline: true });
		}

		// Permissions Changes
		if (oldChannel.permissionOverwrites.cache !== channel.permissionOverwrites.cache) {
			// Make collections of new/removed/changed permissionOverwrites
			const addedOverwrites = channel.permissionOverwrites.cache.filter((newOverwrite) => !oldChannel.permissionOverwrites.cache.find((oldOverwrite) => oldOverwrite.id === newOverwrite.id));
			const removedOverwrites = oldChannel.permissionOverwrites.cache.filter((oldOverwrite) => !channel.permissionOverwrites.cache.find((newOverwrite) => newOverwrite.id === oldOverwrite.id));
			const changedOverwrites = channel.permissionOverwrites.cache.filter((newOverwrite) => {
				// Find corresponding old permissionsOverwrite
				const oldOverwrite = oldChannel.permissionOverwrites.cache.find((overwrite) => overwrite.id === newOverwrite.id);
				// If this is a new one, we'll already have caught it above
				if (!oldOverwrite) return false;
				// If no permissions have changed, filter it out
				if (newOverwrite.allow === oldOverwrite.allow && newOverwrite.deny === oldOverwrite.deny) return false;
				return true;
			});

			// New Overwrites
			if (addedOverwrites && addedOverwrites.size) {
				const lines = [];
				for (const overwritePair of addedOverwrites) {
					const overwrite = overwritePair[1];

					const bitfield = new PermissionsBitField().add(overwrite.allow).remove(overwrite.deny);
					const permDifferences = getPermissionDifference(new PermissionsBitField, bitfield);

					if (overwrite.type === OverwriteType.Member) {
						const member = await channel.guild.members.fetch(overwrite.id);
						if (!member) continue;
						lines.push(`~~~ Member: ${member.displayName} ~~~`);
					}

					if (overwrite.type === OverwriteType.Role) {
						const role = await channel.guild.roles.fetch(overwrite.id);
						if (!role) continue;
						lines.push(`~~~ Role: ${role.name} ~~~`);
					}

					if (permDifferences.added.length) lines.push(...permDifferences.added.map((str) => `+ ${str}`));
					if (permDifferences.removed.length) lines.push(...permDifferences.removed.map((str) => `- ${str}`));
				}
				if (lines.length) embed.addFields({ name: 'Added Permission Overrides', value: `\`\`\`diff\n${lines.join('\n')}\`\`\``, inline: false });
			}

			// Removed Overwrites
			if (removedOverwrites && removedOverwrites.size) {
				const lines = [];
				for (const overwritePair of removedOverwrites) {
					const overwrite = overwritePair[1];

					if (overwrite.type === OverwriteType.Member) {
						const member = await channel.guild.members.fetch(overwrite.id);
						if (!member) continue;
						lines.push(`- Member: ${member.displayName}`);
					}

					if (overwrite.type === OverwriteType.Role) {
						const role = await channel.guild.roles.fetch(overwrite.id);
						if (!role) continue;
						lines.push(`- Role: ${role.name}`);
					}
				}
				if (lines.length) embed.addFields({ name: 'Removed Permission Overrides', value: `\`\`\`diff\n${lines.join('\n')}\`\`\``, inline: false });
			}

			// Changed Overwrites
			if (changedOverwrites && changedOverwrites.size) {
				const lines = [];
				for (const overwritePair of changedOverwrites) {
					const overwrite = overwritePair[1];

					const oldOverwrite = oldChannel.permissionOverwrites.cache.find((ovr) => ovr.id === overwrite.id);
					if (!oldOverwrite) continue;

					const bitfield = new PermissionsBitField().add(overwrite.allow).remove(overwrite.deny);
					const oldBitfield = new PermissionsBitField().add(oldOverwrite.allow).remove(oldOverwrite.deny);
					const permDifferences = getPermissionDifference(oldBitfield, bitfield);

					// If no differences, don't add to embed
					if (!permDifferences.added.length && !permDifferences.removed.length) continue;

					if (overwrite.type === OverwriteType.Member) {
						const member = await channel.guild.members.fetch(overwrite.id);
						if (!member) continue;
						lines.push(`~~~ Member: ${member.displayName} ~~~`);
					}

					if (overwrite.type === OverwriteType.Role) {
						const role = await channel.guild.roles.fetch(overwrite.id);
						if (!role) continue;
						lines.push(`~~~ Role: ${role.name} ~~~`);
					}

					if (permDifferences.added.length) lines.push(...permDifferences.added.map((str) => `+ ${str}`));
					if (permDifferences.removed.length) lines.push(...permDifferences.removed.map((str) => `- ${str}`));
				}
				if (lines.length) embed.addFields({ name: 'Changed Permission Overrides', value: `\`\`\`diff\n${lines.join('\n')}\`\`\``, inline: false });
			}
		}

		// Add audit log info to embed
		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Edited By', value: auditLogEntry.executor.toString(), inline: false });
		}

		// 25 fields/embed max
		// 256 chars/field name max
		// 1024 chars/field value max
		// TODO: Need to implement checks for this and split embeds
		return embed.data.fields?.length ? [embed] : [];;
	}
}
