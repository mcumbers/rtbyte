import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberAdd })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (isNullish(member.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(member.guild.id);
		if (!guildSettingsInfoLogs || !guildSettingsInfoLogs.guildMemberAddLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = member.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, await this.generateGuildLog(member));
	}

	private async generateGuildLog(member: GuildMember) {
		const embed = new GuildLogEmbed()
			.setTitle(`${member.user.bot ? 'Bot Added to' : 'User Joined'} Server`)
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.addBlankFields({ name: '', value: '', inline: true })
			.addFields({ name: 'Account Created', value: `<t:${Math.round(member.user.createdTimestamp as number / 1000)}:R>`, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(Events.GuildMemberAdd)
			.setTimestamp(member.joinedTimestamp);

		if (member.flags.has("DidRejoin")) {
			embed.setTitle(`${member.user.bot ? 'Bot Added Back to' : 'User re-Joined'} Server`);

			const memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);

			if (memberData && memberData.leaveTimes.length) {
				const lastLeave: Date = memberData?.leaveTimes[memberData.leaveTimes.length - 1];
				embed.addFields({ name: 'Left Server', value: `<t:${Math.round(lastLeave.getTime() as number / 1000)}:R>`, inline: false });
			}
		}

		return [embed];
	}
}
