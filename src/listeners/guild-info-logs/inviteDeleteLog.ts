import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Invite, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.InviteDelete })
export class UserEvent extends Listener {
	public async run(invite: Invite) {
		if (isNullish(invite.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(invite.guild.id);
		if (!guildSettingsInfoLogs?.inviteDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const guild = this.container.client.guilds.resolve(invite.guild.id);
		if (!guild) return;

		const logChannel = guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.InviteDelete, guild, invite);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(invite, auditLogEntry));
	}

	private generateGuildLog(invite: Invite | undefined, auditLogEntry: GuildAuditLogsEntry | null) {
		if (!invite) return null;

		const embed = new GuildLogEmbed()
			.setTitle('Invite Deleted')
			.setDescription(invite.url)
			.setThumbnail(invite.guild?.iconURL() || null)
			.setFooter({ text: `Invite Code: ${invite.code}` })
			.setType(Events.InviteDelete);

		if (invite.channel) embed.addFields({ name: 'Invite Channel', value: invite.channel.url, inline: true });

		// Unfortunately, the Invite object given from this Event doesn't have the createdTimestamp, so we can't show when it was created

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Deleted By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
