import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { BaseGuildTextChannel, ContextMenuCommandInteraction, Message, type ChatInputCommandInteraction } from 'discord.js';

export interface CommandRunEvent {
	interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
	failed?: boolean,
	message?: Message | Message<boolean>,
	runtime?: number
}

@ApplyOptions<ListenerOptions>({ event: CustomEvents.BotCommandRun })
export class UserEvent extends Listener {
	public async run(event: CommandRunEvent) {
		const { client, prisma } = this.container;

		const botGlobalSettings = await prisma.botGlobalSettings.fetch(client.id as string);
		if (!botGlobalSettings) return;

		const controlGuild = await client.guilds.fetch(botGlobalSettings?.controlGuildID as string);
		const privateGlobalLogChannel = await controlGuild.channels.fetch(botGlobalSettings?.globalLogChannelPrivate as string) as BaseGuildTextChannel;
		if (!privateGlobalLogChannel) return;

		// If Command Succeeded, and we're not logging successful commands, return
		if (!event.failed && !botGlobalSettings.globalLogCommandExecution) return;

		// If Command Failed, and we're not logging failed commands, return
		if (event.failed && !botGlobalSettings.globalLogCommandExecutionFailure) return;


		return this.container.client.emit(CustomEvents.GuildLogCreate, privateGlobalLogChannel, await this.generateGuildLog(event));
	}

	private async generateGuildLog(event: CommandRunEvent) {
		const { prisma } = this.container;
		const { interaction, failed, message, runtime } = event;

		const embed = new GuildLogEmbed()
			.setTitle(`Command ${failed ? 'Execution Failed' : 'Executed'}`)
			.setDescription(`${interaction.user.username} used ${interaction.commandName}`)
			.setThumbnail(interaction.user?.avatarURL() as string)
			.setType(failed ? Events.GuildDelete : Events.GuildCreate)
			.setFooter({ text: `Interaction ID: ${interaction.id}` });

		if (runtime) embed.addFields({ name: 'Execution Time', value: `${runtime}ms`, inline: true });

		if (interaction.guild) {
			// See if this Guild has disabled Command Usage Sharing
			const guildSettings = await prisma.guildSettings.fetch(interaction.guild.id);
			if (guildSettings && !guildSettings.shareGuildCommandUsage) return null;

			embed.addFields({ name: 'Guild', value: interaction.guild.name, inline: true });

			// If this Guild disabled Detailed Command Usage Sharing, we're all done.
			if (!guildSettings?.shareGuildCommandUsageDetailed) return [embed];

			// Add a link to the interaction reply if it's not ephemeral
			if (message && !message.flags.has("Ephemeral")) embed.addFields({ name: 'Follow-Up', value: message.url, inline: false })
		}

		// List the Options given for this command interaction
		const paramStrings: string[] = [];
		if (interaction.options.data.length) {
			for (const option of interaction.options.data) {
				paramStrings.push(`${option.name}:\t${option.value}`);
			}
		}
		if (paramStrings.length) embed.addFields({ name: 'Parameters', value: `\`\`\`${paramStrings.join('\n')}\`\`\``, inline: false });

		return [embed];
	}
}
