import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, Invite, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.InviteCreate })
export class UserEvent extends Listener {
	public async run(invite: Invite) {
		if (isNullish(invite.guild) && isNullish(invite.guildScheduledEvent)) return;

		const guildID = invite.guild ? invite.guild.id : invite.guildScheduledEvent ? invite.guildScheduledEvent.guildId : null;
		if (!guildID) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(invite.guild?.id as string);
		if (!guildSettingsInfoLogs?.inviteCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const guild = this.container.client.guilds.resolve(guildID);
		const fetchedInvite = await guild?.invites.fetch({ code: invite.code });
		const logChannel = guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = invite.inviter;

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(fetchedInvite, executor));
	}

	private generateGuildLog(invite: Invite | undefined, creator: User | null | undefined) {
		if (!invite) return null;

		const embed = new GuildLogEmbed()
			.setTitle('Invite Created')
			.setDescription(invite.url)
			.setThumbnail(invite.guild?.iconURL() || null)
			.setFooter({ text: `Invite Code: ${invite.code}` })
			.setType(Events.InviteCreate);

		if (invite.channel) embed.addFields({ name: 'Invite Channel', value: invite.channel.url, inline: true });
		embed.addFields({ name: 'Expires', value: `${invite.expiresTimestamp ? `<t:${Math.round(invite.expiresTimestamp as number / 1000)}:R>` : 'Never'}`, inline: true });
		if (invite.maxUses) embed.addFields({ name: 'Uses', value: `\`${invite.uses}/${invite.maxUses}\``, inline: true });
		if (invite.guildScheduledEvent) embed.addFields({ name: 'Event', value: invite.guildScheduledEvent.url, inline: true });
		if (invite.temporary) embed.addFields({ name: 'Membership Type', value: '`Temporary`', inline: true });

		if (!isNullish(creator)) embed.addFields({ name: 'Created By', value: creator.toString(), inline: true });

		return [embed]
	}
}
