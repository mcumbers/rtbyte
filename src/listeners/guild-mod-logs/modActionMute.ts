import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getAuditLogEntry } from '#utils/util';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ListenerOptions } from '@sapphire/framework';
import { AuditLogEvent, BaseGuildTextChannel, GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: CustomEvents.ModActionMute })
export class UserEvent extends Listener {
	public async run(member: GuildMember) {
		if (!member.communicationDisabledUntil) return;

		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberUpdate, member.guild, member.user);

		// Log ModAction
		const modAction = await this.container.prisma.modAction.create({
			data: {
				guildID: member.guild.id,
				type: ModActionType.MUTE,
				targetID: member.id,
				executorID: auditLogEntry?.executorId,
				auditLogID: auditLogEntry?.id,
				createdAt: auditLogEntry?.createdAt || new Date(),
				reason: auditLogEntry?.reason,
				effectiveUntil: member.communicationDisabledUntil
			}
		});

		if (!modAction) {
			// Something's up--we couldn't create this ModAction
			return;
		}

		const embed = await new ModActionLogEmbed().fromModAction(modAction);

		const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(member.guild.id);
		if (!guildSettingsModActions || (!guildSettingsModActions.muteLog && !guildSettingsModActions.muteLogPublic)) return;

		if (guildSettingsModActions.modLogChannel && guildSettingsModActions.muteLog) {
			const modLogChannel = member.guild.channels.resolve(guildSettingsModActions.modLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, [embed]);
		}

		if (guildSettingsModActions.modLogChannelPublic && guildSettingsModActions.muteLogPublic) {
			const modLogChannelPublic = member.guild.channels.resolve(guildSettingsModActions.modLogChannelPublic) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, [embed]);
		}
	}

}
