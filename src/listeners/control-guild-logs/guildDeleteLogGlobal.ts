import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { BaseGuildTextChannel, Guild, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildDelete })
export class UserEvent extends Listener {
	public async run(guild: Guild) {
		if (!guild.available) return;
		const { client, prisma } = this.container;

		const botGlobalSettings = await prisma.botGlobalSettings.findUnique({ where: { id: client.id as string } });
		const controlGuild = await client.guilds.fetch(botGlobalSettings?.controlGuildID as string);
		const privateGlobalLogChannel = await controlGuild.channels.fetch(botGlobalSettings?.globalLogChannelPrivate as string) as BaseGuildTextChannel;

		if (!privateGlobalLogChannel) return;

		return this.container.client.emit('guildLogCreate', privateGlobalLogChannel, await this.generateGuildLog(guild));
	}

	private async generateGuildLog(guild: Guild) {
		// Get Owner's User from cache
		const owner = this.container.client.users.resolve(guild.ownerId) as User;
		// Get count of Member entries in database from this guild
		const registeredMembers = await this.container.prisma.member.count({ where: { guildID: guild.id } });

		let botMemberInfo = await this.container.prisma.member.findFirst({ where: { userID: this.container.client.id as string, guildID: guild.id } });

		const leaveTimes = [...botMemberInfo!.leaveTimes];
		leaveTimes.push(new Date(Date.now()));

		botMemberInfo = await this.container.prisma.member.update({ where: { id: botMemberInfo!.id }, data: { leaveTimes } });
		const lastJoin = botMemberInfo.joinTimes[botMemberInfo.joinTimes.length - 1];

		const embed = new GuildLogEmbed()
			.setTitle('Bot Removed From Server')
			.setDescription(guild.name)
			.setThumbnail(guild.iconURL())
			.addFields({ name: 'Created', value: `<t:${Math.round(guild.createdTimestamp as number / 1000)}:R>`, inline: true })
			.addFields({ name: 'Registered Members', value: `${registeredMembers}`, inline: true })
			.addFields({ name: 'Owner', value: `${owner.toString()} | \`@${owner.username}\``, inline: false })
			.addFields({ name: 'Added to Server', value: `<t:${Math.round(lastJoin.getTime() as number / 1000)}:R>`, inline: false })
			.setFooter({ text: `Guild ID: ${guild.id}` })
			.setType(Events.GuildDelete);

		return [embed];
	}
}
