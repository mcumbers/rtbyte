import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { type APIEmbedField, type BaseGuildTextChannel, type User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.UserUpdate })
export class UserEvent extends Listener {
	public async run(oldUser: User, user: User) {
		if (isNullish(user.id)) return;

		const embed = this.generateGuildLog(oldUser, user);

		for await (const guildContainer of this.container.client.guilds.cache) {
			const guild = guildContainer[1];

			if (!(await guild.members.fetch(user))) continue;

			const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: guild.id } });
			if (!guildSettingsInfoLogs?.guildMemberUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

			const logChannel = guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
			this.container.client.emit('guildLogCreate', logChannel, embed);
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

		const changes: APIEmbedField[] = [];
		// Check if Username changed
		if (oldUser.username !== user.username) {
			changes.push({ name: 'Username Changed', value: `\`\`\`diff\n- ${oldUser.username}\n+ ${user.username}\n\`\`\``, inline: false });
		}

		// Check if Display Name changed
		if (oldUser.globalName !== user.globalName) {
			if (!oldUser.globalName) {
				changes.push({ name: 'Display Name Added', value: `\`\`\`diff\n+ ${user.globalName}\n\`\`\``, inline: false });
			}
			if (!user.globalName) {
				changes.push({ name: 'Display Name Removed', value: `\`\`\`diff\n- ${oldUser.globalName}\n\`\`\``, inline: false });
			}
			if (oldUser.globalName && user.globalName) {
				changes.push({ name: 'Display Name Changed', value: `\`\`\`diff\n- ${oldUser.globalName}\n+ ${user.globalName}\n\`\`\``, inline: false });
			}
		}

		// Check if Avatar changed
		if (oldUser.avatar !== user.avatar) {
			changes.push({ name: 'User Avatar Changed', value: '', inline: false });
		}

		// Add fields to embed
		if (changes.length) embed.addBlankFields(changes);

		return [embed];
	}
}
