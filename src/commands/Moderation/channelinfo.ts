import { BotCommand } from '#lib/extensions/BotCommand';
import { BotEmbed } from '#lib/extensions/BotEmbed';
import { minutes, seconds } from '#utils/common/times';
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { ForumChannel, MediaChannel, NewsChannel, PermissionFlagsBits, StageChannel, TextChannel, ThreadChannel, VoiceChannel } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Retrieve information about a channel',
	preconditions: [['IsGuildOwner', ['HasAdminRole', ['HasModRole']]]]
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
				.setDMPermission(false)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel to fetch information for')
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				));
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		// Check to see if response should be ephemeral
		const ephemeral = interaction.options.getBoolean('private') ?? false;
		await interaction.deferReply({ ephemeral, fetchReply: true });

		// Fetch targetChannel from Discord
		const targetChannel = interaction.guild?.channels.resolve(interaction.options.getChannel('channel')?.id as string);
		if (!targetChannel) return interaction.followUp({ content: `Unable to fetch information for ${targetChannel}, please try again later.`, ephemeral });

		// Fetch this Guild's log settings
		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(interaction.guild?.id as string);
		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(interaction.guild?.id as string)

		// Gather Info for Response Embed
		const channelInfo = [];

		// Show whether the targetChannel is designated as the Info Log Channel for the Guild
		if (guildSettingsInfoLogs?.infoLogChannel === targetChannel.id) channelInfo.push('- Bot Info Log channel');
		if (guildSettingsModActions?.modLogChannel === targetChannel.id) channelInfo.push('- Moderation Log Channel');
		if (guildSettingsModActions?.modLogChannelPublic === targetChannel.id) channelInfo.push('- Public Moderation Log Channel');

		// Create Response Embed
		const embed = new BotEmbed()
			.setTitle('Channel Information')
			.setDescription(`${targetChannel.url}`)
			.setThumbnail(interaction.guild?.iconURL() ?? null)
			.setFooter({ text: `Channel ID: ${targetChannel.id}` });

		if (targetChannel.parent) embed.addFields({ name: 'Category', value: targetChannel.parent.name, inline: true });
		embed.addFields({ name: 'Created', value: `<t:${Math.round(targetChannel.createdTimestamp as number / 1000)}:R>`, inline: true });

		if (targetChannel instanceof ForumChannel || targetChannel instanceof MediaChannel) {
			if (targetChannel.availableTags) embed.addFields({ name: 'Tags', value: targetChannel.availableTags.map(tag => `${tag.emoji ? targetChannel.guild.emojis.resolve(tag.emoji.id as string) ?? tag.emoji.name : ''} ${tag.name}`).join(', '), inline: true });
			if (targetChannel.defaultAutoArchiveDuration) embed.addFields({ name: 'Stale Threads Hide After', value: `${new DurationFormatter().format(minutes(targetChannel.defaultAutoArchiveDuration ?? 4320))}`, inline: true });
			if (targetChannel.defaultReactionEmoji) embed.addFields({ name: 'Default Reaction', value: `${targetChannel.guild.emojis.resolve(targetChannel.defaultReactionEmoji.id as string) ?? targetChannel.defaultReactionEmoji.name}`, inline: true });
			if (targetChannel.defaultSortOrder) {
				const sortOrder = ['Recent Activity', 'Creation Time'];
				embed.addFields({ name: 'Sorted By', value: `${sortOrder[targetChannel.defaultSortOrder!]}`, inline: true })
			}
			if (targetChannel.defaultThreadRateLimitPerUser) embed.addFields({ name: 'Message Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.defaultThreadRateLimitPerUser))}`, inline: true });
			if (targetChannel.nsfw) channelInfo.push('- Marked NSFW');
			if (targetChannel.rateLimitPerUser) embed.addFields({ name: 'Post Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.rateLimitPerUser))}`, inline: true });
			if (targetChannel.topic) embed.addFields({ name: 'Post guidelines', value: targetChannel.topic, inline: true });
		}

		if (targetChannel instanceof ForumChannel) {
			if (targetChannel.defaultForumLayout) {
				const forumLayout = ['Not set', 'List view', 'Gallery view'];
				embed.addFields({ name: 'Default Layout', value: `${forumLayout[targetChannel.defaultForumLayout]}`, inline: true });
			}
		}

		if (targetChannel instanceof NewsChannel || targetChannel instanceof TextChannel) {
			if (targetChannel.defaultAutoArchiveDuration) embed.addFields({ name: 'Stale Threads Hide After', value: `${new DurationFormatter().format(minutes(targetChannel.defaultAutoArchiveDuration ?? 4320))}`, inline: true });
			if (targetChannel.defaultThreadRateLimitPerUser) embed.addFields({ name: 'Thread Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.defaultThreadRateLimitPerUser))}`, inline: true });
			if (targetChannel.nsfw) channelInfo.push('- Marked NSFW');
			if (targetChannel.topic) embed.addFields({ name: 'Channel Topic', value: targetChannel.topic, inline: true });
		}

		if (targetChannel instanceof ThreadChannel) {
			if (targetChannel.rateLimitPerUser) embed.addFields({ name: 'Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.rateLimitPerUser))}`, inline: true });
		}

		if (targetChannel instanceof TextChannel) {
			if (targetChannel.rateLimitPerUser) embed.addFields({ name: 'Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.rateLimitPerUser))}`, inline: true });
		}

		if (targetChannel instanceof StageChannel) {
			if (targetChannel.topic) embed.addFields({ name: 'Channel Topic', value: targetChannel.topic, inline: true });
		}

		if (targetChannel instanceof StageChannel || targetChannel instanceof VoiceChannel) {
			if (targetChannel.nsfw) channelInfo.push('- Marked NSFW');
			if (targetChannel.rateLimitPerUser) embed.addFields({ name: 'Slowmode', value: `${new DurationFormatter().format(seconds(targetChannel.rateLimitPerUser))}`, inline: true });
		}

		// Add extra information gathered in channelInfo
		if (channelInfo.length) embed.addFields({ name: 'Details', value: channelInfo.join('\n') });

		// Send response
		return interaction.followUp({ content: '', embeds: [embed], ephemeral });
	}
}
