import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, type BaseGuildTextChannel, type GuildAuditLogsEntry, type GuildMember, type Role } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildMemberUpdate })
export class UserEvent extends Listener {
	public async run(oldMember: GuildMember, member: GuildMember) {
		if (isNullish(member.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(member.guild.id);
		if (!guildSettingsInfoLogs?.guildMemberUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = member.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberUpdate, member.guild, member.user);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(oldMember, member, auditLogEntry));
	}

	private generateGuildLog(oldMember: GuildMember, member: GuildMember, auditLogEntry: GuildAuditLogsEntry | null) {
		// Some updates that raise this event don't show in the server Audit Log (like updating a server-specific avatar)
		// This means the executor grabbed from the audit log won't be accurate--as there actually isn't one.
		let showsInAuditLog: boolean = true;
		const embed = new GuildLogEmbed()
			.setTitle(`${member.user.bot ? 'Bot' : 'User'} Profile Updated`)
			.setDescription(member.toString())
			.setThumbnail(member.user.displayAvatarURL())
			.setFooter({ text: `User ID: ${member.user.id}` })
			.setType(Events.GuildMemberUpdate);

		// Check if Nickname changed
		if (oldMember.nickname !== member.nickname) {
			if (!oldMember.nickname) embed.addFields({ name: 'Nickname Added', value: `\`\`\`diff\n+${member.nickname}\n\`\`\``, inline: false });
			if (!member.nickname) embed.addFields({ name: 'Nickname Removed', value: `\`\`\`diff\n-${oldMember.nickname}\n\`\`\``, inline: false });
			if (oldMember.nickname && member.nickname) embed.addFields({ name: 'Nickname Changed', value: `\`\`\`diff\n-${oldMember.nickname}\n+${member.nickname}\n\`\`\``, inline: false });
		}

		// Check if Avatar changed
		// NOTE: Does not create an entry in the Audit Log
		if (oldMember.avatar !== member.avatar) {
			showsInAuditLog = false;
			if (!oldMember.avatar) embed.addFields({ name: 'Server Avatar Added', value: '', inline: false });
			if (!member.avatar) embed.addFields({ name: 'Server Avatar Removed', value: '', inline: false });
			if (oldMember.avatar && member.avatar) embed.addFields({ name: 'Server Avatar Changed', value: '', inline: false });
		}

		// Check if Roles changed
		if (oldMember.roles.cache !== member.roles.cache) {
			const oldRoles = oldMember.roles.cache;
			const roles = member.roles.cache;
			const addedRoles: Role[] = [];
			const removedRoles: Role[] = [];

			for (const [key, role] of roles.entries()) {
				if (!oldRoles.has(key)) addedRoles.push(role);
			}
			for (const [key, role] of oldRoles.entries()) {
				if (!roles.has(key)) removedRoles.push(role);
			}

			const lines = [];
			if (addedRoles.length || removedRoles.length) {
				for (const role of addedRoles) {
					lines.push(`+${role.name}`);
				}
				for (const role of removedRoles) {
					lines.push(`-${role.name}`);
				}
			}

			if (lines.length) embed.addFields({ name: 'Roles Changed', value: `\`\`\`diff\n${lines.join('\n')}\n\`\`\``, inline: false });
		}

		// Show if changes were made by a different user or if we can see the executor
		if (showsInAuditLog && auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Edited By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return embed.data.fields?.length ? [embed] : [];
	}
}
