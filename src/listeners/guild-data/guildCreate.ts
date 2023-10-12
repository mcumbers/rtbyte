import { initializeGuild } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { bold, gray } from 'colorette';
import { Guild } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildCreate })
export class UserEvent extends Listener {
	public async run(guild: Guild) {
		this.container.logger.info(`Bot added to guild ${bold(guild.name)} (${gray(guild.id)})`);

		if (!guild.available) return;

		await initializeGuild(guild);
	}
}
