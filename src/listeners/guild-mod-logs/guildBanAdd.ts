import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildBan } from 'discord.js';
import { AuditLogEvent } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildBanAdd })
export class UserEvent extends Listener {
	public async run(guildBan: GuildBan) {
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanAdd, guildBan.guild, guildBan.user);

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: guildBan.guild.id,
				type: ModActionType.BAN,
				targetID: guildBan.user.id,
				executorID: auditLogEntry?.executorId,
				auditLogID: auditLogEntry?.id,
				createdAt: auditLogEntry?.createdAt || new Date(),
				reason: auditLogEntry?.reason
			}
		});

		if (!modAction) {
			// Something's up--we couldn't create this ModAction
			return;
		}

		const embed = await new ModActionLogEmbed().fromModAction(modAction);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(guildBan.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.banLog && !guildSettingsModActions.banLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.banLog) {
			const modLogChannel = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.banLogPublic) {
			const modLogChannelPublic = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
		}
	}

}
