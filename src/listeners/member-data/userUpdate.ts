import { initializeMember, initializeUser } from '#root/lib/util/functions/initialize.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.UserUpdate })
export class UserEvent extends Listener {
	public async run(oldUser: User, user: User) {
		if (oldUser.username === user.username && oldUser.displayName === user.displayName) return;

		let userSettings = await this.container.prisma.userSettings.fetch(user.id);
		if (!userSettings) {
			await initializeUser(user);
			userSettings = await this.container.prisma.userSettings.fetch(user.id);
			if (!userSettings) return;
		}

		if (userSettings.disableBot) return;

		for await (const guild of this.container.client.guilds.cache.values()) {
			if (!(await guild.members.fetch(user).catch(() => undefined))) continue;

			let memberData = await this.container.prisma.member.fetchTuple([user.id, guild.id], ['userID', 'guildID']);
			if (!memberData) {
				await initializeMember(user, guild);
				memberData = await this.container.prisma.member.fetchTuple([user.id, guild.id], ['userID', 'guildID']);
				if (!memberData) continue;
			}

			const { usernameHistory, displayNameHistory } = memberData;

			if (!usernameHistory.includes(oldUser.username)) usernameHistory.push(oldUser.username);
			if (!usernameHistory.includes(user.username)) usernameHistory.push(user.username);
			if (!displayNameHistory.includes(oldUser.displayName)) displayNameHistory.push(oldUser.displayName);
			if (!displayNameHistory.includes(user.displayName)) displayNameHistory.push(user.displayName);

			await this.container.prisma.member.update({ where: { id: memberData.id }, data: { usernameHistory, displayNameHistory } });
		}
	}
}
