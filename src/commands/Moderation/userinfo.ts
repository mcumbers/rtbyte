import { BotCommand } from '#lib/extensions/BotCommand';
import { BotEmbed } from '#lib/extensions/BotEmbed';
import { initializeMember } from '#root/lib/util/functions/initialize';
import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { Colors, Emojis } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand } from '@sapphire/framework';
import { inlineCodeBlock } from '@sapphire/utilities';
import { GuildMember, GuildMemberFlags, PermissionFlagsBits, UserFlags, UserFlagsBitField } from 'discord.js';

@ApplyOptions<ChatInputCommand.Options>({
	description: 'Retrieve information about a user',
	preconditions: [['IsGuildOwner', ['HasAdminRole', ['HasModRole']]]]
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
			message = await interaction.followUp({ content: `Unable to fetch information for the specified member, please try again later.` });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const roles = member?.roles.cache.filter(role => role.name !== '@everyone');
		const joinPosition = interaction.guild?.members.cache.sort((memberA, memberB) => Number(memberA.joinedTimestamp) - Number(memberB.joinedTimestamp)).map(mbr => mbr).indexOf(member as GuildMember);

		let memberData = await this.container.prisma.member.fetch(member.id);

		if (!memberData) {
			await initializeMember(member.user, member.guild, member);
			memberData = await this.container.prisma.member.fetch(member.id);
		}

		if (!memberData) {
			message = await interaction.followUp({ content: 'Whoops! Something went wrong... ' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		}

		const embed = new BotEmbed()
			.setDescription(`${member} ${inlineCodeBlock(`${member?.id}`)}`)
			.setThumbnail(member?.displayAvatarURL() ?? null)
			.setColor(member?.roles.highest.color ?? Colors.White)
			.addFields(
				{ name: 'Join position', value: inlineCodeBlock(`${joinPosition! + 1}`), inline: true },
				{ name: 'Joined', value: `<t:${Math.round(member?.joinedTimestamp as number / 1000)}:R>`, inline: true },
				{ name: 'Registered', value: `<t:${Math.round(member?.user.createdTimestamp as number / 1000)}:R>`, inline: true },
			);

		if (roles?.map(role => role).length) embed.addFields({ name: `Roles (${roles?.size})`, value: roles!.map(role => role).join(' ') });
		if (memberData.usernameHistory.length > 1) embed.addFields({ name: 'Previous usernames', value: inlineCodeBlock(memberData.usernameHistory.join(', ')) });
		if (memberData.displayNameHistory.length > 1) embed.addFields({ name: 'Previous nicknames', value: inlineCodeBlock(memberData.displayNameHistory.join(', ')) });

		const userInfo = [];
		if (member.isCommunicationDisabled()) userInfo.push(`${Emojis.Bullet}Currently timed out, will be removed <t:${Math.round(member?.communicationDisabledUntilTimestamp as number / 1000)}:R>`);
		if (member?.premiumSinceTimestamp) userInfo.push(`${Emojis.Bullet}Nitro boosting since <t:${Math.round(member.premiumSinceTimestamp as number / 1000)}:R>`);
		if (member?.user.bot) userInfo.push(`${Emojis.Bullet}${member.user.flags?.has(UserFlagsBitField.Flags.VerifiedBot) ? 'Verified bot' : 'Bot'}`);
		if (member?.user.flags?.has(UserFlags.Staff)) userInfo.push(`${Emojis.Bullet}Discord staff`);
		if (member?.user.flags?.has(UserFlags.Partner)) userInfo.push(`${Emojis.Bullet}Partnered server owner`);
		if (member?.user.flags?.has(UserFlags.ActiveDeveloper)) userInfo.push(`${Emojis.Bullet}Active developer`);
		if (member?.flags.has(GuildMemberFlags.DidRejoin)) userInfo.push(`${Emojis.Bullet}Has rejoined`);
		if (userInfo.length) embed.addFields({ name: 'Details', value: userInfo.join('\n') });

		message = await interaction.followUp({ content: '', embeds: [embed] });
		return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
	}
}
