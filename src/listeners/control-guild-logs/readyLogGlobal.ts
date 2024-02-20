import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.ClientReady })
export class UserEvent extends Listener {
	public async run() {
		const { client, prisma } = this.container;

		const botGlobalSettings = await prisma.botGlobalSettings.fetch(client.id as string);
		const controlGuild = await client.guilds.fetch(botGlobalSettings?.controlGuildID as string);
		const publicGlobalLogChannel = await controlGuild.channels.fetch(botGlobalSettings?.globalLogChannelPublic as string) as BaseGuildTextChannel;

		if (!publicGlobalLogChannel) return;

		return this.container.client.emit('guildLogCreate', publicGlobalLogChannel, this.generateGuildLog());
	}

	private generateGuildLog() {
		const { client } = this.container;

		const embed = new GuildLogEmbed()
			.setTitle('Bot Restarted')
			.setDescription(client.user?.username as string)
			.setThumbnail(client.user?.avatarURL() as string)
			.setType(Events.ClientReady);

		return [embed];
	}
}
