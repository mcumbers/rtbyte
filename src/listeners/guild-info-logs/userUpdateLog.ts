import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import type { BaseGuildTextChannel, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.UserUpdate })
export class UserEvent extends Listener {
	public async run(oldUser: User, user: User) {
		if (isNullish(user.id)) return;

		const embed = this.generateGuildLog(oldUser, user);

		for await (const guild of this.container.client.guilds.cache.values()) {
			if (!(await guild.members.fetch(user).catch(() => undefined))) continue;

			const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(guild.id);
			if (!guildSettingsInfoLogs?.guildMemberUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

			const logChannel = guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
			this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, embed);
		}
	}

	private generateGuildLog(oldUser: User, user: User) {
		const embed = new GuildLogEmbed()
			.setTitle(`${user.bot ? 'Bot' : 'User'} Profile Updated`)
			.setDescription(user.toString())
			.setThumbnail(user.displayAvatarURL())
			.setFooter({ text: `User ID: ${user.id}` })
			.setTimestamp(Date.now())
			.setType(Events.GuildMemberUpdate);

		// Check if Username changed
		if (oldUser.username !== user.username) {
			embed.addFields({ name: 'Username Changed', value: `\`\`\`diff\n-${oldUser.username}\n+${user.username}\n\`\`\``, inline: false });
		}

		// Check if Display Name changed
		if (oldUser.globalName !== user.globalName) {
			if (!oldUser.globalName) {
				embed.addFields({ name: 'Display Name Added', value: `\`\`\`diff\n+ ${user.globalName}\n\`\`\``, inline: false });
			}
			if (!user.globalName) {
				embed.addFields({ name: 'Display Name Removed', value: `\`\`\`diff\n- ${oldUser.globalName}\n\`\`\``, inline: false });
			}
			if (oldUser.globalName && user.globalName) {
				embed.addFields({ name: 'Display Name Changed', value: `\`\`\`diff\n- ${oldUser.globalName}\n+ ${user.globalName}\n\`\`\``, inline: false });
			}
		}

		// Check if Avatar changed
		if (oldUser.avatar !== user.avatar) {
			embed.addBlankFields({ name: 'User Avatar Changed', value: '', inline: false });
		}

		return embed.data.fields?.length ? [embed] : [];
	}
}
