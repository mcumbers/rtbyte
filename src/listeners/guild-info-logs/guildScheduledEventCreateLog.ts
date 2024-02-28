import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { BaseGuildTextChannel, GuildScheduledEvent, User } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildScheduledEventCreate })
export class UserEvent extends Listener {
	public async run(event: GuildScheduledEvent) {
		if (isNullish(event.id)) return;
		if (isNullish(event.guild)) return;

		const fetchedEvent = await event.guild.scheduledEvents.fetch(event.id);

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(event.guild.id);
		if (!guildSettingsInfoLogs?.guildScheduledEventCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = event.guild?.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, this.generateGuildLog(fetchedEvent, fetchedEvent.creator));
	}

	private generateGuildLog(event: GuildScheduledEvent, creator: User | null | undefined) {
		const embed = new GuildLogEmbed()
			.setTitle('Event Created')
			.setDescription(`[${event.name as string}](${event.url as string})`)
			.setThumbnail(event.guild!.iconURL())
			.setFooter({ text: `Event ID: ${event.id}` })
			.setType(Events.GuildScheduledEventCreate);

		if (event.description) embed.addFields({ name: 'Description', value: event.description, inline: false });
		if (event.image) embed.setImage(event.coverImageURL());
		if (event.scheduledStartTimestamp) embed.addFields({ name: 'Start Time', value: `<t:${Math.round(event.scheduledStartTimestamp as number / 1000)}>`, inline: true });
		if (event.scheduledEndTimestamp) embed.addFields({ name: 'End Time', value: `<t:${Math.round(event.scheduledEndTimestamp as number / 1000)}>`, inline: true });
		if (event.channel) embed.addFields({ name: 'Event Channel', value: event.channel.url, inline: true });

		if (!isNullish(creator)) embed.addFields({ name: 'Created By', value: creator.toString(), inline: false });

		return [embed]
	}
}
