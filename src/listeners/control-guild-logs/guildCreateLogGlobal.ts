import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { initializeMember } from '#utils/functions/initialize';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildCreate })
export class UserEvent extends Listener {
	public async run(guild: Guild) {
		if (!guild.available) return;
		const { client, prisma } = this.container;

		const clientSettings = await prisma.clientSettings.findUnique({ where: { id: client.id as string } });
		const controlGuild = await client.guilds.fetch(clientSettings?.controlGuildID as string);
		const privateGlobalLogChannel = await controlGuild.channels.fetch(clientSettings?.globalLogChannelPrivate as string) as BaseGuildTextChannel;

		if (!privateGlobalLogChannel) return;

		const executor = await getAuditLogExecutor(AuditLogEvent.BotAdd, guild, client.user as User);

		return this.container.client.emit('guildLogCreate', privateGlobalLogChannel, await this.generateGuildLog(guild, executor));
	}

	private async generateGuildLog(guild: Guild, executor: User | null | undefined) {
		const fetchedGuild = await guild.fetch();
		// Fetch Owner through client.users so they'll be in the cache
		const owner = await this.container.client.users.fetch(guild.ownerId);

		const embed = new GuildLogEmbed()
			.setTitle('Bot Added to Server')
			.setDescription(guild.name)
			.setThumbnail(guild.iconURL())
			.addFields({ name: 'Created', value: `<t:${Math.round(guild.createdTimestamp as number / 1000)}:R>`, inline: true })
			.addFields({ name: 'Members', value: `${fetchedGuild.approximateMemberCount}`, inline: true })
			.addFields({ name: 'Owner', value: `${owner.toString()} | \`@${owner.username}\``, inline: false })
			.setFooter({ text: `Guild ID: ${guild.id}` })
			.setType(Events.GuildCreate)
			.setTimestamp(guild.joinedTimestamp);

		const botMember = await guild.members.fetch(this.container.client.id as string);

		if (botMember.flags.has("DidRejoin")) {
			embed.setTitle('Bot Added back to Server');

			const memberInit = await initializeMember(this.container.client.user as User, guild);
			const botMemberInfo = memberInit?.memberInfo || null;

			if (botMemberInfo && botMemberInfo.leaveTimes.length) {
				const lastLeave: Date = botMemberInfo?.leaveTimes[botMemberInfo.leaveTimes.length - 1];
				embed.addFields({ name: 'Removed From Server', value: `<t:${Math.round(lastLeave.getTime() as number / 1000)}:R>`, inline: false });
			}
		}

		if (!isNullish(executor)) embed.addFields({ name: 'Added By', value: `${executor.toString()} | \`@${executor.username}\``, inline: false });

		return [embed];
	}
}
