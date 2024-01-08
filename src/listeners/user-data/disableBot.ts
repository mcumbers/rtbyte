import { initializeUser } from '#root/lib/util/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: 'userDisableBot' })
export class UserEvent extends Listener {
	public async run(user: User) {
		let userData = await this.container.prisma.user.findFirst({ where: { id: user.id }, include: { settings: true, members: { include: { xpData: true } } } });

		if (!userData || !userData.settings) {
			await initializeUser(user);
			userData = await this.container.prisma.user.findFirst({ where: { id: user.id }, include: { settings: true, members: { include: { xpData: true } } } });
		}

		// Clear User's global settings, ensure disableBot is set
		await this.container.prisma.userSettings.update({
			where: { id: userData!.settings!.id }, data: {
				chatLanguage: null,
				chatMeasurementUnits: null,
				disableBot: true
			}
		})

		// Clear Username & displayname history for all MemberData
		// Also delete all xpData
		if (userData!.members.length) {
			for await (const member of userData!.members) {
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
