import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { bold, gray } from 'colorette';
import { Guild } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildDelete })
export class UserEvent extends Listener {
	public run(guild: Guild) {
		this.container.logger.info(`Bot removed from guild ${bold(guild.name)} (${gray(guild.id)})`);
	}
}
