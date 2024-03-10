import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, GuildBan, type BaseGuildTextChannel } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildBanRemove })
export class UserEvent extends Listener {
	public async run(guildBan: GuildBan) {
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanRemove, guildBan.guild, guildBan.user);

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: guildBan.guild.id,
				type: ModActionType.UNBAN,
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
		if (!guildSettingsModActions || (!guildSettingsModActions.unbanLog && !guildSettingsModActions.unbanLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.unbanLog) {
			const modLogChannel = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, [embed]);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.unbanLogPublic) {
			const modLogChannelPublic = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, [embed]);
		}
	}

}
