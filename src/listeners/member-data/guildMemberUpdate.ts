import { initializeMember, initializeUser } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberUpdate })
export class UserEvent extends Listener {
	public async run(oldMember: GuildMember, member: GuildMember) {
		if (member.user.bot) return;
		if (oldMember.nickname === member.nickname) return;

		let userSettings = await this.container.prisma.userSettings.fetch(member.user.id);
		if (!userSettings) {
			await initializeUser(member.user);
			userSettings = await this.container.prisma.userSettings.fetch(member.user.id);
			if (!userSettings) return;
		}

		if (userSettings.disableBot) return;

		let memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
		if (!memberData) {
			await initializeMember(member.user, member.guild, member);
			memberData = await this.container.prisma.member.fetchTuple([member.id, member.guild.id], ['userID', 'guildID']);
			if (!memberData) return;
		}

		const { displayNameHistory } = memberData;

		if (oldMember.nickname && !displayNameHistory.includes(oldMember.nickname)) displayNameHistory.push(oldMember.nickname);
		if (member.nickname && !displayNameHistory.includes(member.nickname)) displayNameHistory.push(member.nickname);

		await this.container.prisma.member.update({ where: { id: memberData.id }, data: { displayNameHistory } });
	}
}
