import { initializeUser } from '#root/lib/util/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: 'userDisableBot' })
export class UserEvent extends Listener {
	public async run(user: User) {
		let userSettings = await this.container.prisma.userSettings.fetch(user.id);

		if (!userSettings) {
			await initializeUser(user);
			userSettings = await this.container.prisma.userSettings.fetch(user.id);
		}

		// Clear User's global settings, ensure disableBot is set
		await this.container.prisma.userSettings.update({
			where: { id: userSettings?.id }, data: {
				chatLanguage: null,
				chatMeasurementUnits: null,
				disableBot: true
			}
		});

		// Grab all Member objects for this User
		const userMembers = await this.container.prisma.member.findMany({ where: { userID: user.id } });

		// Clear Username & displayname history for all MemberData
		// Also delete all xpData
		if (userMembers?.length) {
			for await (const member of userMembers) {
				await this.container.prisma.member.update({
					where: { id: member.id }, data: {
						usernameHistory: [],
						displayNameHistory: [],
						xpData: { delete: true }
					}
				})
			}
		}
	}
}
