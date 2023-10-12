import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { Emojis } from '#utils/constants';
import { getChannelDescriptor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { inlineCodeBlock, isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, Guild, Invite, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.InviteDelete })
export class UserEvent extends Listener {
	public async run(invite: Invite) {
		if (isNullish(invite.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: invite.guild.id } });
		if (!guildSettingsInfoLogs?.inviteDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const guild = this.container.client.guilds.resolve(invite.guild.id);
		const fetchedInvite = await guild?.invites.fetch({ code: invite.code });
		const logChannel = guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = invite.inviter;

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(fetchedInvite, guild, executor));
	}

	private generateGuildLog(invite: Invite | undefined, guild: Guild | null, executor: User | null | undefined) {
		const embed = new GuildLogEmbed()
			.setAuthor({
				name: `${invite?.code}`,
				url: `https://discord.gg/${invite?.code}`,
				iconURL: guild?.iconURL() as string
			})
			.setDescription(`[${inlineCodeBlock(`discord.gg/${invite?.code}`)}](https://discord.gg/${invite?.code})`)
			.setFooter({ text: `Invite deleted ${isNullish(executor) ? '' : `by ${executor.username}`}`, iconURL: isNullish(executor) ? undefined : executor?.displayAvatarURL() })
			.setType(Events.InviteDelete);

		if (invite && invite.channel) {
			const channelDescriptor = getChannelDescriptor(invite?.channel?.type);
			if (channelDescriptor) embed.addFields({ name: channelDescriptor, value: `<#${invite?.channelId}>`, inline: true });
		}
		if (invite?.createdTimestamp) embed.addFields({ name: 'Created', value: `<t:${Math.round(invite.createdTimestamp as number / 1000)}:R>`, inline: true });
		if (invite?.maxUses) embed.addFields({ name: 'Uses', value: `${inlineCodeBlock(`${invite.uses}/${invite.maxUses}`)}`, inline: true });

		const details = [];
		if (invite?.temporary) details.push(`${Emojis.Bullet}${inlineCodeBlock(`Grants temporary membership`)}`);
		if (details.length) embed.addFields({ name: 'Details', value: details.join('\n') });

		return [embed]
	}
}
