import type { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: 'guildLogCreate' })
export class UserEvent extends Listener {
	public run(logChannel: BaseGuildTextChannel | null, logEmbeds: GuildLogEmbed[] | null) {
		if (isNullish(logChannel)) return;
		if (!logEmbeds || !logEmbeds.length) return;

		return logChannel.send({ embeds: logEmbeds });
	}
}
