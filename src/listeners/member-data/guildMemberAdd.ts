import { initializeMember, initializeUser } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberAdd })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (member.user.bot) return;

		let userSettings = await this.container.prisma.userSettings.fetch(member.id);
		if (!userSettings) {
			await initializeUser(member.user);
			userSettings = await this.container.prisma.userSettings.fetch(member.id);
			if (!userSettings) return;
		}

		let memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
		if (!memberData) {
			await initializeMember(member.user, member.guild);
			memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
			if (!memberData) return;
		}

		const { joinTimes, usernameHistory, displayNameHistory } = memberData;

		// Join & Leave times will be tracked even if user opted out
		const now = new Date();
		if (!joinTimes.includes(member.joinedAt ?? now)) joinTimes.push(now);

		// Username & Display names are only tracked if user hasn't opted out
		if (!userSettings.disableBot) {
			if (!usernameHistory.includes(member.user.username)) usernameHistory.push(member.user.username);
			if (!displayNameHistory.includes(member.user.displayName)) displayNameHistory.push(member.user.displayName);
			if (member.nickname && !displayNameHistory.includes(member.nickname)) displayNameHistory.push(member.nickname);
		}

		await this.container.prisma.member.update({ where: { id: memberData.id }, data: { joinTimes, usernameHistory, displayNameHistory } });
	}
}
