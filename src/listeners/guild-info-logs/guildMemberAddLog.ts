import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberAdd })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (isNullish(member.id)) return;
		if (member.user.bot) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: member.guild.id } });
		if (!guildSettingsInfoLogs?.guildMemberAddLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = member.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit('guildLogCreate', logChannel, await this.generateGuildLog(member));
	}

	private async generateGuildLog(member: GuildMember) {
		const embed = new GuildLogEmbed()
			.setTitle('User Joined Server')
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.addBlankFields({ name: '', value: '', inline: true })
			.addFields({ name: 'Account Created', value: `<t:${Math.round(member.user.createdTimestamp as number / 1000)}:R>`, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(Events.GuildMemberAdd);

		if (member.flags.has("DidRejoin")) {
			embed.setTitle('User re-Joined Server');

			const memberData = await this.container.prisma.member.findFirst({ where: { userID: member.id, guildID: member.guild.id } });

			if (memberData && memberData.leaveTimes.length) {
				const lastLeave: Date = memberData?.leaveTimes[memberData.leaveTimes.length - 1];
				embed.addFields({ name: 'Left Server', value: `<t:${Math.round(lastLeave.getTime() as number / 1000)}:R>`, inline: false });
			}
		}

		return [embed];
	}
}
