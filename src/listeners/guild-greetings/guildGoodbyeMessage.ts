import { parseMessage } from '#utils/functions/messagePlaceholders';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { BaseGuildTextChannel, ClientUser, GuildMember, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberRemove })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (isNullish(member.id)) return;
		if (member.user.bot) return;

		const guildSettings = await this.container.prisma.guildSettings.findUnique({ where: { id: member.guild.id } });
		if (!guildSettings || !guildSettings?.greetingGoodbyeEnabled || !guildSettings?.greetingGoodbyeChannel) return;

		const logChannel = member.guild.channels.resolve(guildSettings.greetingGoodbyeChannel) as BaseGuildTextChannel;

		const template = guildSettings?.greetingGoodbyeMessage as string;
		const parsedMessage = parseMessage(template, { bot: this.container.client.user as ClientUser, guild: member.guild!, member: member as GuildMember, user: member.user as User });

		return logChannel.send(parsedMessage);
	}

}
