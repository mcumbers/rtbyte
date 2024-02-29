import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, GuildBan, type BaseGuildTextChannel, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildBanRemove })
export class UserEvent extends Listener {
	public async run(guildBan: GuildBan) {
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberBanRemove, guildBan.guild, guildBan.user);
		const embed = await this.generateGuildLog(guildBan, auditLogEntry);

		// Log ModAction
		await this.container.prisma._prisma.modAction.create({
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

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(guildBan.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.unbanLog && !guildSettingsModActions.unbanLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.unbanLog) {
			const modLogChannel = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, embed);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.unbanLogPublic) {
			const modLogChannelPublic = guildBan.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, embed);
		}
	}

	private async generateGuildLog(guildBan: GuildBan, auditLogEntry: GuildAuditLogsEntry | null) {
		const banEntries = await guildBan.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd });
		const banEntry = banEntries.entries.find((entry) => entry.targetId === guildBan.user.id);

		const embed = new GuildLogEmbed()
			.setTitle('User Unbanned from Server')
			.setDescription(guildBan.user.toString())
			.setThumbnail(guildBan.user.avatarURL())
			.addFields({ name: 'Username', value: guildBan.user.username, inline: true })
			.setFooter({ text: `User ID: ${guildBan.user.id}` })
			.setType(Events.GuildBanRemove);

		if (banEntry) {
			embed.addBlankFields({ name: '', value: '', inline: true });
			embed.addFields({ name: 'User Banned', value: `<t:${Math.round(banEntry.createdTimestamp / 1000)}:R>`, inline: true });
			if (banEntry.reason) embed.addFields({ name: 'Ban Reason', value: banEntry.reason, inline: false });
			if (banEntry.executor) embed.addFields({ name: 'Banned By', value: banEntry.executor.toString(), inline: false });
		}

		if (auditLogEntry) {
			if (auditLogEntry.reason) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (auditLogEntry.executor) embed.addFields({ name: 'Unbanned By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed];
	}
}
