import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberRemove })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (isNullish(member.id)) return;
		if (member.user.bot) return;

		const memberData = await this.container.prisma.member.findFirst({ where: { userID: member.id, guildID: member.guild.id } });
		// Don't bother initializing memberData if it doesn't already exist. They just left the server.
		if (!memberData) return;

		// Join & Leave times will be tracked even if user opted out
		const leaveTimes = memberData?.leaveTimes;
		leaveTimes?.push(new Date(Date.now()));

		await this.container.prisma.member.update({ where: { id: memberData?.id }, data: { leaveTimes } });
	}
}
