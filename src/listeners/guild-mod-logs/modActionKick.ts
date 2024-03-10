import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildAuditLogsActionType, GuildAuditLogsEntry, GuildAuditLogsTargetType, GuildMember } from 'discord.js';
import { AuditLogEvent } from 'discord.js';

export interface ModActionKickEvent {
	member: GuildMember,
	auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent> | null
}

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionKick })
export class UserEvent extends Listener {
	public async run(event: ModActionKickEvent) {
		const { member, auditLogEntry } = event;

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: member.guild.id,
				type: ModActionType.KICK,
				targetID: member.id,
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

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.kickLog && !guildSettingsModActions.kickLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.kickLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, [embed]);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.kickLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, [embed]);
		}
	}

}
