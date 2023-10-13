import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getAuditLogExecutor } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, GuildScheduledEvent, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildScheduledEventDelete })
export class UserEvent extends Listener {
	public async run(event: GuildScheduledEvent) {
		if (isNullish(event.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: event.guildId } });
		if (!guildSettingsInfoLogs?.guildScheduledEventDeleteLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = event.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const executor = await getAuditLogExecutor(AuditLogEvent.GuildScheduledEventDelete, event.guild as Guild, event);

		return this.container.client.emit('guildLogCreate', logChannel, this.generateGuildLog(event, executor));
	}

	private generateGuildLog(event: GuildScheduledEvent, executor: User | null | undefined) {
		const embed = new GuildLogEmbed()
			.setTitle('Event Deleted')
			.setThumbnail(event.guild!.iconURL())
			.setFooter({ text: `Event ID: ${event.id}` })
			.setType(Events.GuildScheduledEventDelete);

		if (event.name) embed.setDescription(event.name as string);
		if (event.description && !event.name) embed.addFields({ name: 'Description', value: event.description as string, inline: false });

		if (event.createdTimestamp) embed.addFields({ name: 'Created', value: `<t:${Math.round(event.createdTimestamp as number / 1000)}:R>`, inline: true });
		if (!isNullish(executor)) embed.addFields({ name: 'Deleted By', value: executor.toString(), inline: false });

		return [embed]
	}
}
