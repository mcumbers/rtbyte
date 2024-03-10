import { BotCommand } from '#lib/extensions/BotCommand';
import { BotEmbed } from '#lib/extensions/BotEmbed';
import { initializeMember } from '#root/lib/util/functions/initialize';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { Colors } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand } from '@sapphire/framework';
import { inlineCodeBlock } from '@sapphire/utilities';
import { GuildMember, GuildMemberFlags, PermissionFlagsBits, UserFlags, UserFlagsBitField } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Retrieve information about a user',
	preconditions: ['IsModerator']
})

export class UserCommand extends BotCommand {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setDMPermission(false)
				.addUserOption((option) =>
					option
						.setName('member')
						.setDescription('The member to fetch information for')
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				));
	}

	public async chatInputRun(interaction: ChatInputCommand.Interaction) {
		const startTime = Date.now();
		const ephemeral = interaction.options.getBoolean('private') ?? false;
		let message = await interaction.deferReply({ ephemeral, fetchReply: true });

		const member = interaction.guild?.members.resolve(interaction.options.getUser('member')?.id as string);
		if (!member) {
			message = await interaction.followUp({ content: 'Unable to fetch information for the specified member, please try again later.' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const roles = member.roles.cache.filter(role => role.name !== '@everyone');
		const joinPosition = interaction.guild?.members.cache.sort((memberA, memberB) => Number(memberA.joinedTimestamp) - Number(memberB.joinedTimestamp)).map(mbr => mbr).indexOf(member as GuildMember);

		let memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);

		if (!memberData) {
			await initializeMember(member.user, member.guild, member);
			memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
		}

		if (!memberData) {
			message = await interaction.followUp({ content: 'Whoops! Something went wrong... ' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const embed = new BotEmbed()
			.setTitle('User Information')
			.setDescription(member.toString())
			.setThumbnail(member.displayAvatarURL() ?? null)
			.setColor(member.roles.highest.color ?? Colors.White)
			.addFields(
				{ name: 'Join position', value: `${joinPosition! + 1}`, inline: true },
				{ name: 'Joined', value: `<t:${Math.round(member?.joinedTimestamp as number / 1000)}:R>`, inline: true },
				{ name: 'Registered', value: `<t:${Math.round(member?.user.createdTimestamp as number / 1000)}:R>`, inline: true },
			);

		if (roles?.map(role => role).length) embed.addFields({ name: `Roles (${roles?.size})`, value: roles!.map(role => role).join(' ') });
		if (memberData.usernameHistory.length > 1) embed.addFields({ name: 'Previous usernames', value: inlineCodeBlock(memberData.usernameHistory.join(', ')) });
		if (memberData.displayNameHistory.length > 1) embed.addFields({ name: 'Previous nicknames', value: inlineCodeBlock(memberData.displayNameHistory.join(', ')) });

		if (member.isCommunicationDisabled()) embed.addFields({ name: 'Timed Out Until', value: `<t:${Math.round(member?.communicationDisabledUntilTimestamp as number / 1000)}:R>`, inline: true });
		if (member?.premiumSinceTimestamp) embed.addFields({ name: 'Server Boosting Since', value: `<t:${Math.round(member.premiumSinceTimestamp as number / 1000)}:R>`, inline: true });
		if (member?.user.bot) embed.addFields({ name: 'Bot Status', value: `${member.user.flags?.has(UserFlagsBitField.Flags.VerifiedBot) ? 'Verified' : 'Unverified'}`, inline: true });

		if (member.user.flags) {
			const flagsInfo: string[] = [];
			if (member.user.flags.has(UserFlags.Spammer)) flagsInfo.push('- Identified as a Spammer by Discord');
			if (member.user.flags.has(UserFlags.Quarantined)) flagsInfo.push('- Quarantined by Discord');

			if (member.user.flags.has(UserFlags.Staff)) flagsInfo.push(`- Discord Staff Member`);
			if (member.user.flags.has(UserFlags.Partner)) flagsInfo.push(`- Partnered Server Owner`);

			if (member.flags.has(GuildMemberFlags.DidRejoin)) flagsInfo.push(`- Has Rejoined this Server`);
			if (flagsInfo.length) embed.addFields({ name: 'Special Notes', value: flagsInfo.join('\n') });
		}

		message = await interaction.followUp({ content: '', embeds: [embed] });
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
