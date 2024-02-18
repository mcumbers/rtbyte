import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Collection, Message, TextChannel, type Channel, type FetchMessagesOptions, type Guild, type User } from 'discord.js';

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
	preconditions: [['IsGuildOwner', ['HasAdminRole', ['HasModRole']]]]
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
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
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true, fetchReply: true });
		if (!interaction.guild) return interaction.followUp({ content: 'This Command can only be used in Servers.', embeds: [], ephemeral: true });

		const numMessagesToDelete = interaction.options.getNumber('messages') || 1;
		const targetUser = interaction.options.getUser('user');

		const targetChannel = interaction.channel as TextChannel;
		if (!targetChannel) return interaction.followUp({ content: 'This Command can only be used in Text Channels.', embeds: [], ephemeral: true });

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
		if (!targetMessages.size) return interaction.followUp({ content: 'Could not find any messages that fit the criteria in this Channel.', embeds: [], ephemeral: true });

		// If we're not forcing the delete of older messages, we're done
		if (!interaction.options.getBoolean('purge-old')) {
			// Bulk Delete the messages and respond to the user
			try {
				await targetChannel.bulkDelete(targetMessages, true);

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

				this.container.client.emit('modActionPurge', purgeEvent);
				return interaction.followUp({ content: `Deleted ${targetMessages.size} Messages ${targetUser ? `from ${targetUser.toString()} ` : ''}in this Channel.`, embeds: [], ephemeral: true });
			} catch (error) {
				return interaction.followUp({ content: 'Whoops... Something went wrong...' });
			}
		}

		const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);

		const bulkDeletable = targetMessages.filter((message) => message.createdTimestamp > cutoff);
		const nonBulkDeletable = targetMessages.filter((val, key) => val && !bulkDeletable.has(key));

		try {
			// Bulk Delete any messages we can
			await targetChannel.bulkDelete(bulkDeletable, true);

			await interaction.followUp({ content: `Purge Running...\nDeleted ${bulkDeletable.size}/${bulkDeletable.size} Recent Messages...\nDeleted 0/${nonBulkDeletable.size} Old Messages...` });

			// Store a list of messages being deleted in the database
			const interactionProgress = await this.container.prisma.interactionProgress.create({
				data: {
					id: interaction.id,
					executorID: interaction.user.id,
					entities: [...nonBulkDeletable.keys()]
				}
			})

			// Update interaction every 5% of progress
			const updateInterval = Math.round(nonBulkDeletable.size / 20);
			let manualDeletedNum = 0;

			// Manually Delete every other message
			for await (const pair of nonBulkDeletable) {
				const message = pair[1];
				await message.delete();

				manualDeletedNum++;
				if (manualDeletedNum >= nonBulkDeletable.size) return await interaction.editReply({ content: `Deleted ${targetMessages.size} Messages ${targetUser ? `from ${targetUser.toString()} ` : ''}in this Channel.` });
				if (manualDeletedNum % updateInterval === 0) await interaction.editReply({ content: `Purge Running...\nDeleted ${bulkDeletable.size}/${bulkDeletable.size} Recent Messages...\nDeleted ${manualDeletedNum}/${nonBulkDeletable.size} Old Messages...` });
			}

			// Remove the information about this purge from the database
			await this.container.prisma.interactionProgress.delete({ where: { id: interactionProgress.id } });
			return await interaction.editReply({ content: `Deleted ${targetMessages.size} Messages ${targetUser ? `from ${targetUser.toString()} ` : ''}in this Channel.` });
		} catch (error) {
			return interaction.followUp({ content: 'Whoops... Something went wrong...' });
		}

	}

}
