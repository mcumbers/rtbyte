import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseGuildTextChannel, GuildAuditLogsActionType, GuildAuditLogsEntry, GuildAuditLogsTargetType, GuildMember, VoiceState } from 'discord.js';
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

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.vcKickLog && !guildSettingsModActions.vcKickLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.vcKickLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, this.generateGuildLog(member, oldState, auditLogEntry));
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.vcKickLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, this.generateGuildLog(member, oldState, auditLogEntry));
		}

	}

	private generateGuildLog(member: GuildMember, oldState: VoiceState, auditLogEntry: GuildAuditLogsEntry<AuditLogEvent, GuildAuditLogsActionType, GuildAuditLogsTargetType, AuditLogEvent> | null) {
		const embed = new GuildLogEmbed()
			.setTitle('User Kicked From Voice Chat')
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.addFields({ name: 'Username', value: member.user.username, inline: true })
			.addBlankFields({ inline: true })
			.addFields({ name: 'Channel', value: oldState.channel?.url as string, inline: true })
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(CustomEvents.ModActionVCKick);

		if (auditLogEntry) {
			if (auditLogEntry.reason) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (auditLogEntry.executor) embed.addFields({ name: 'Kicked By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
