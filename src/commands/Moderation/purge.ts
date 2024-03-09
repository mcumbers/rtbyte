import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Collection, Message, PermissionFlagsBits, TextChannel, type Channel, type FetchMessagesOptions, type Guild, type GuildMember, type User } from 'discord.js';
import { setTimeout } from 'timers/promises';

export interface ModActionPurgeEvent {
	id: string,
	executor: User,
	channel: Channel,
	guild: Guild,
	messagesCount: number,
	createdAt: Date,
	createdTimestamp: number,
	targetUser?: User,
	reason?: string
}

@ApplyOptions<Command.Options>({
	description: "Mass Delete Messages from this Channel",
	preconditions: ['IsModerator']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addNumberOption((option) =>
					option
						.setName('messages')
						.setDescription('Number of Messages to Delete')
						.setMinValue(1)
						.setMaxValue(1000)
						.setRequired(true)
				)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('Only Delete Messages from this User')
				)
				.addStringOption((option) =>
					option
						.setName('reason')
						.setDescription('Reason for Deleting Messages')
				)
				.addBooleanOption((option) =>
					option
						.setName('purge-old')
						.setDescription('Purge Messages Older than 14 Days')
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const startTime = Date.now();
		const ephemeral = interaction.options.getBoolean('private') ?? false;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });
		if (!interaction.guild) {
			message = await interaction.followUp({ content: 'This Command can only be used in Servers.', components: [], embeds: [] });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const numMessagesToDelete = interaction.options.getNumber('messages') || 1;
		const targetUser = interaction.options.getUser('user');

		const targetChannel = interaction.channel as TextChannel;
		if (!targetChannel) {
			message = await interaction.followUp({ content: 'This Command can only be used in Text Channels.', components: [], embeds: [] });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		if (!targetChannel.permissionsFor(interaction.member as GuildMember).has(PermissionFlagsBits.ManageMessages)) {
			message = await interaction.followUp({ content: `You don't have permission to delete messages in ${targetChannel.url}`, components: [], embeds: [] });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		let messagesColl: null | Collection<string, Message<boolean>> = null;

		let lastMessage: Message<boolean> | null = null;
		// Can only fetch 100 messages at a time max
		// If not deleting messages from a specific user, don't bother fetching extra messages
		const fetchLimit = numMessagesToDelete <= 100 && !targetUser ? numMessagesToDelete : 100;

		while (!messagesColl || messagesColl.size < numMessagesToDelete) {
			const options: FetchMessagesOptions = { limit: fetchLimit };
			if (lastMessage) options.around = lastMessage.id;

			let messages: Collection<string, Message<boolean>> = await targetChannel.messages.fetch(options);

			if (targetUser) messages = messages.filter((message) => message.author.id === targetUser.id);

			if (messagesColl) {
				const newEntries = messages.filter((val, key) => val && !messagesColl?.has(key));
				messagesColl = messagesColl ? messagesColl.concat(newEntries) : messages;
			} else {
				messagesColl = messages;
			}

			// Check to see if the final message returned in this fetch is the same as the last fetch
			// If so, we've hit our limit, and we'll break the loop to move on
			const newLastMessage = messages.last();
			if (!lastMessage && newLastMessage) lastMessage = newLastMessage;
			if (lastMessage && newLastMessage && lastMessage.id === newLastMessage.id) break;
		}

		// Make sure we're only deleting up to the amount of messages specified
		const targetKeys = messagesColl.firstKey(numMessagesToDelete);
		const targetMessages = messagesColl.filter((val, key) => val && targetKeys.includes(key));

		// Fail if no messages to delete
		if (!targetMessages.size) {
			message = await interaction.followUp({ content: 'Could not find any messages that fit the criteria in this Channel.', components: [], embeds: [] });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		// Prep ModActionPurgeEvent
		const purgeEvent: ModActionPurgeEvent = {
			id: interaction.id,
			executor: interaction.user,
			channel: interaction.channel as Channel,
			guild: interaction.guild,
			messagesCount: targetMessages.size,
			createdAt: interaction.createdAt,
			createdTimestamp: interaction.createdTimestamp,
			targetUser: targetUser ?? undefined,
			reason: interaction.options.getString('reason') ?? undefined
		}

		// If we're not forcing the delete of older messages, we're done
		if (!interaction.options.getBoolean('purge-old')) {
			// Bulk Delete the messages and respond to the user
			try {
				await targetChannel.bulkDelete(targetMessages, true);

				message = await interaction.followUp({ content: `Deleted ${targetMessages.size} Message${targetMessages.size > 1 ? 's' : ''} ${targetUser ? `from ${targetUser.toString()} ` : ''}in this Channel.`, components: [], embeds: [] });
				this.sendLogEvent(purgeEvent);
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
			} catch (error) {
				message = await interaction.followUp({ content: 'Whoops... Something went wrong...' });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
			}
		}

		const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);

		const bulkDeletable = targetMessages.filter((message) => message.createdTimestamp > cutoff);
		const nonBulkDeletable = targetMessages.filter((val, key) => val && !bulkDeletable.has(key));

		try {
			// Bulk Delete any messages we can
			await targetChannel.bulkDelete(bulkDeletable, true);

			message = await interaction.followUp({ content: `Purge Running...\nDeleted ${bulkDeletable.size}/${bulkDeletable.size} Recent Messages...\nDeleted 0/${nonBulkDeletable.size} Old Messages...` });

			// Add an entry to the liveCache about this interaction so individual message deletes aren't logged
			const liveInteraction = { id: interaction.id, executorID: interaction.user.id, entities: [...targetMessages.keys()] };
			this.container.liveCache.liveInteractions.set(liveInteraction.id, liveInteraction);

			// Update interaction every 5% of progress
			const updateInterval = Math.round(nonBulkDeletable.size / 20);
			let manualDeletedNum = 0;

			// Manually Delete every other message
			for await (const pair of nonBulkDeletable) {
				const targetMessage = pair[1];
				await targetMessage.delete();

				manualDeletedNum++;
				if (manualDeletedNum % updateInterval === 0) message = await interaction.editReply({ content: `Purge Running...\nDeleted ${bulkDeletable.size}/${bulkDeletable.size} Recent Messages...\nDeleted ${manualDeletedNum}/${nonBulkDeletable.size} Old Messages...` });
			}

			// Wait 1 second, then remove the information about this purge from the database
			// TODO: Change liveInteraction to have a start time, then regularly just clean up the database?
			await setTimeout(1000, this.container.liveCache.liveInteractions.delete(liveInteraction.id));

			message = await interaction.editReply({ content: `Deleted ${targetMessages.size} Messages ${targetUser ? `from ${targetUser.toString()} ` : ''}in this Channel.` });
			this.sendLogEvent(purgeEvent);
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		} catch (error) {
			message = await interaction.followUp({ content: 'Whoops... Something went wrong...' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
		}

	}

	private sendLogEvent(logEvent: ModActionPurgeEvent) {
		this.container.client.emit(CustomEvents.ModActionPurge, logEvent);
	}

}
