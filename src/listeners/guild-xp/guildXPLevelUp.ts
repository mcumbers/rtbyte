import { type XPLevel } from '#utils/functions/xp';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { Message, type GuildMember, type GuildTextBasedChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: 'guildXPLevelUp' })
export class UserEvent extends Listener {
	public async run(member: GuildMember, xpLevel: XPLevel, message?: Message) {
		// TODO: guildSettingsXp.levelUpNotifyMessage -- Make a simple and naive string replacer where you can use tags for contextual info?
		const guildSettingsXP = await this.container.prisma.guildSettingsXP.findUnique({ where: { id: member.guild.id } });
		if (!guildSettingsXP || !guildSettingsXP.levelUpNotifiy) return;

		if (guildSettingsXP.levelUpNotifyReply) {
			if (message) await message.reply({ content: `Congrats ${member.toString()}! You reached Level ${xpLevel.level}!` });
		}

		if (guildSettingsXP.levelUpNotifyDM) {
			await member.send({ content: `Congrats ${member.toString()}! You reached Level ${xpLevel.level}!` });
		}

		if (guildSettingsXP.levelUpNotifyChannel) {
			const channel = await member.guild.channels.fetch(guildSettingsXP.levelUpNotifyChannel) as GuildTextBasedChannel;
			// Should probably implement error handling here? Maybe just notify in info-log if channel isn't valid?
			if (channel) {
				await channel.send({ content: `Congrats ${member.toString()}! You reached Level ${xpLevel.level}!` });
			}
		}
	}
}
