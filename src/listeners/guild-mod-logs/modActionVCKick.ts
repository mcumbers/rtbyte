import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, VoiceState } from 'discord.js';
import { AuditLogEvent, Events } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.VoiceStateUpdate })
export class UserEvent extends Listener {
	public async run(oldState: VoiceState, newState: VoiceState) {
		const { member } = newState;
		// If this isn't in a guild, exit
		if (!member) return;

		// If User didn't disconnect from VC, exit
		if (newState.channelId !== null) return

		// Seek only audit log entries from the last two seconds
		// This will occasionally cause false positives, or miss kicks sometimes due to bot latency...
		// TODO: Another option would be to track audit log entry IDs in a cache and "claim" amounts on their count of users disconnected?
		// TODO: Add interaction buttons to remove false positives and extend cutoff?
		const cutoff = Date.now() - 2_000;

		// Check if a disconnection was added to the Audit Log within the cutoff
		const auditLogEntries = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberDisconnect });
		const auditLogEntry = auditLogEntries.entries.find((entry) => entry.createdTimestamp > cutoff);
		if (!auditLogEntry) return;

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: member.guild.id,
				type: ModActionType.VCKICK,
				targetID: member.id,
				executorID: auditLogEntry?.executorId,
				auditLogID: auditLogEntry?.id,
				createdAt: auditLogEntry?.createdAt || new Date(),
				reason: auditLogEntry?.reason,
				channelID: oldState.channelId
			}
		});

		if (!modAction) {
			// Something's up--we couldn't create this ModAction
			return;
		}

		const embed = await new ModActionLogEmbed().fromModAction(modAction);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.vcKickLog && !guildSettingsModActions.vcKickLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.vcKickLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.vcKickLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
		}

	}

}
