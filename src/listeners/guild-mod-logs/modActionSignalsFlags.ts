import { ModActionLogEmbed } from '#root/lib/extensions/ModActionLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { ModActionType } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { UserFlags, type BaseGuildTextChannel, type GuildBasedChannel, type User } from 'discord.js';

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
			if (!(await guild.members.fetch(user).catch(() => undefined))) continue;

			// Log ModAction
			const modAction = await this.container.prisma.modAction.create({
				data: {
					guildID: guild.id,
					type: spammerFlagAdded ? ModActionType.FLAG_SPAMMER_ADD : spammerFlagRemoved ? ModActionType.FLAG_SPAMMER_REMOVE : quarantineFlagAdded ? ModActionType.FLAG_QUARANTINE_ADD : quarantineFlagRemoved ? ModActionType.FLAG_QUARANTINE_REMOVE : ModActionType.FLAG_QUARANTINE_REMOVE,
					targetID: user.id,
					createdAt: new Date()
				}
			});

			const guildSettingsModActions = await this.container.prisma.guildSettingsModActions.fetch(guild.id);
			if (!guildSettingsModActions) return;

			let modLogChannel: BaseGuildTextChannel | GuildBasedChannel | null = null;
			if (guildSettingsModActions.modLogChannel) modLogChannel = await guild.channels.fetch(guildSettingsModActions.modLogChannel).catch(null);
			let modLogChannelPublic: BaseGuildTextChannel | GuildBasedChannel | null = null;
			if (guildSettingsModActions.modLogChannelPublic) modLogChannelPublic = await guild.channels.fetch(guildSettingsModActions.modLogChannelPublic).catch(null);


			if (!modAction) {
				// Something's up--we couldn't create this ModAction
				return;
			}

			const embed = await new ModActionLogEmbed().fromModAction(modAction);

			if (spammerFlagAdded) {
				if (guildSettingsModActions.flagSpammerAddLog && modLogChannel) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
				if (guildSettingsModActions.flagSpammerAddLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
			}

			if (spammerFlagRemoved) {
				if (guildSettingsModActions.flagSpammerRemoveLog && modLogChannel) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
				if (guildSettingsModActions.flagSpammerRemoveLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
			}

			if (quarantineFlagAdded) {
				if (guildSettingsModActions.flagQuarantineAddLog && modLogChannel) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
				if (guildSettingsModActions.flagQuarantineAddLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
			}

			if (quarantineFlagRemoved) {
				if (guildSettingsModActions.flagQuarantineRemoveLog && modLogChannel) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannel, embed);
				if (guildSettingsModActions.flagQuarantineRemoveLogPublic && modLogChannelPublic) this.container.client.emit(CustomEvents.ModActionLogCreate, modAction, modLogChannelPublic, embed);
			}
		}
	}

}
