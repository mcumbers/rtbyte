import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ModAction } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildMember } from 'discord.js';

export interface ModActionWarnEvent {
	member: GuildMember,
	modAction: ModAction
}

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionWarn })
export class UserEvent extends Listener {
	public async run(event: ModActionWarnEvent) {
		const { member, modAction } = event;

		const embed = await new ModActionLogEmbed().fromModAction(modAction);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.warnLog && !guildSettingsModActions.warnLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.warnLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, [embed]);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.warnLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, [embed]);
		}
	}

}
