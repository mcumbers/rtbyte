import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { UserFlags, type BaseGuildTextChannel, type GuildBasedChannel, type User } from 'discord.js';

interface SignalsUpdateDetails {
	spammerFlagAdded: boolean,
	spammerFlagRemoved: boolean,
	quarantineFlagAdded: boolean,
	quarantineFlagRemoved: boolean
}

@ApplyOptions<ListenerOptions>({ event: Events.UserUpdate })
export class UserEvent extends Listener {
	public async run(oldUser: User, user: User) {
		// Exit if flags haven't been updated
		if (oldUser.flags === user.flags) return;

		// User flagged as Spammer by Discord
		const spammerFlagAdded = (!oldUser.flags?.has(UserFlags.Spammer) && user.flags?.has(UserFlags.Spammer)) as boolean;
		// User un-flagged as Spammer by Discord
		const spammerFlagRemoved = (oldUser.flags?.has(UserFlags.Spammer) && !user.flags?.has(UserFlags.Spammer)) as boolean;
		// User flagged as Quarantined by Discord
		const quarantineFlagAdded = (!oldUser.flags?.has(UserFlags.Quarantined) && user.flags?.has(UserFlags.Quarantined)) as boolean;
		// User un-flagged as Quarantined by Discord
		const quarantineFlagRemoved = (oldUser.flags?.has(UserFlags.Quarantined) && !user.flags?.has(UserFlags.Quarantined)) as boolean;

		// Exit if none of our signals flags have changed
		if (!(spammerFlagAdded || spammerFlagRemoved || quarantineFlagAdded || quarantineFlagRemoved)) return;

		// Loop through all guilds
		for await (const guild of this.container.client.guilds.cache.values()) {
			// Move in if this user isn't in this guild
			if (!(await guild.members.fetch(user).catch(undefined))) continue;

			const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(guild.id);
			if (!guildSettingsModActions) return;

			let modLogChannel: BaseGuildTextChannel | GuildBasedChannel | null = null;
			if (guildSettingsModActions.modLogChannel) modLogChannel = await guild.channels.fetch(guildSettingsModActions.modLogChannel).catch(null);
			let modLogChannelPublic: BaseGuildTextChannel | GuildBasedChannel | null = null;
			if (guildSettingsModActions.modLogChannelPublic) modLogChannelPublic = await guild.channels.fetch(guildSettingsModActions.modLogChannelPublic).catch(null);

			// Build Embed
			const embed = this.generateGuildLog(user, { spammerFlagAdded, spammerFlagRemoved, quarantineFlagAdded, quarantineFlagRemoved });

			if (spammerFlagAdded) {
				if (guildSettingsModActions.flagSpammerAddLog && modLogChannel) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, embed);
				if (guildSettingsModActions.flagSpammerAddLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, embed);
			}

			if (spammerFlagRemoved) {
				if (guildSettingsModActions.flagSpammerRemoveLog && modLogChannel) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, embed);
				if (guildSettingsModActions.flagSpammerRemoveLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, embed);
			}

			if (quarantineFlagAdded) {
				if (guildSettingsModActions.flagQuarantineAddLog && modLogChannel) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, embed);
				if (guildSettingsModActions.flagQuarantineAddLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, embed);
			}

			if (quarantineFlagRemoved) {
				if (guildSettingsModActions.flagQuarantineRemoveLog && modLogChannel) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannel, embed);
				if (guildSettingsModActions.flagQuarantineRemoveLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.GuildLogCreate, modLogChannelPublic, embed);
			}
		}
	}

	private generateGuildLog(user: User, { spammerFlagAdded, spammerFlagRemoved, quarantineFlagAdded, quarantineFlagRemoved }: SignalsUpdateDetails) {
		const embed = new GuildLogEmbed()
			.setDescription(user.toString())
			.setThumbnail(user.displayAvatarURL())
			.setFooter({ text: `User ID: ${user.id}` });

		if (spammerFlagAdded) {
			embed.setTitle('User Marked as Spammer by Discord');
			embed.setType(CustomEvents.ModActionFlagSpammerAdd);
		}

		if (spammerFlagRemoved) {
			embed.setTitle('User Un-Marked as Spammer by Discord');
			embed.setType(CustomEvents.ModActionFlagSpammerRemove);
		}

		if (quarantineFlagAdded) {
			embed.setTitle('User Marked as Quarantined by Discord');
			embed.setType(CustomEvents.ModActionFlagQuarantineAdd);
		}

		if (quarantineFlagRemoved) {
			embed.setTitle('User Un-Marked as Quarantined by Discord');
			embed.setType(CustomEvents.ModActionFlagQuarantineRemove);
		}

		return [embed];
	}
}
