import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Invite, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.InviteDelete })
export class UserEvent extends Listener {
	public async run(invite: Invite) {
		if (isNullish(invite.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: invite.guild.id } });
		if (!guildSettingsInfoLogs?.inviteDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const guild = this.container.client.guilds.resolve(invite.guild.id);
		if (!guild) return;

		const logChannel = guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.InviteDelete, guild, invite);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(invite, executor));
	}

	private generateGuildLog(invite: Invite | undefined, executor: User | null | undefined) {
		if (!invite) return null;

		const embed = new GuildLogEmbed()
			.setTitle('Invite Deleted')
			.setDescription(invite.url)
			.setThumbnail(invite.guild?.iconURL() || null)
			.setFooter({ text: `Invite Code: ${invite.code}` })
			.setType(Events.InviteDelete);

		if (invite.channel) embed.addFields({ name: 'Invite Channel', value: invite.channel.url, inline: true });

		// Unfortunately, the Invite object given from this Event doesn't have the createdTimestamp, so we can't show when it was created

		if (!isNullish(executor)) embed.addFields({ name: 'Deleted By', value: executor.toString(), inline: true });

		return [embed]
	}
}
