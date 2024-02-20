import { initializeMember } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberAdd })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (isNullish(member.id)) return;
		if (member.user.bot) return;

		let memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
		if (!memberData) {
			await initializeMember(member.user, member.guild);
			memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
		}

		const userSettings = await this.container.prisma.userSettings.fetch(member.id);

		// Join & Leave times will be tracked even if user opted out
		const joinTimes = memberData?.joinTimes;
		joinTimes?.push(member.joinedAt ?? new Date(Date.now()));

		// Username & Display names are only tracked if user hasn't opted out
		const usernameHistory = memberData?.usernameHistory;
		if (!usernameHistory?.includes(member.user.username) && userSettings?.disableBot) usernameHistory?.push(member.user.username);
		const displayNameHistory = memberData?.displayNameHistory;
		if (!displayNameHistory?.includes(member.displayName) && userSettings?.disableBot) displayNameHistory?.push(member.displayName);

		await this.container.prisma.member.update({ where: { id: memberData?.id }, data: { joinTimes, usernameHistory, displayNameHistory } });
	}
}
