import { type XPLevel } from '#utils/functions/xp';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { type GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.MessageCreate })
export class UserEvent extends Listener {
	public run(member: GuildMember, xpLevel: XPLevel) {
		// TODO: Check guildXPSettings to implement LevelUp notificaiton method
		if (member || xpLevel) return null;
		return null;
	}
}
