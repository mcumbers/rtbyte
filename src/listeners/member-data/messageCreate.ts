import { initializeMember } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageCreate })
export class UserEvent extends Listener {
	public async run(message: Message) {
		if (isNullish(message.author.id) || message.author.bot || isNullish(message.guild) || message.author.system || message.webhookId) return;

		const memberData = await this.container.prisma.member.fetchTuple([message.author.id, message.guild.id], ['userID', 'guildID']);
		if (!memberData) await initializeMember(message.author, message.guild);

	}
}
