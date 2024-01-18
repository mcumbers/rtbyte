import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { seconds } from '#utils/common/times';
import { getAuditLogEntry, getSystemChannelFlagString } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { DurationFormatter } from '@sapphire/time-utilities';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Guild, SystemChannelFlagsBitField, type GuildAuditLogsEntry } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildUpdate })
export class UserEvent extends Listener {
	public async run(oldGuild: Guild, guild: Guild) {
		if (isNullish(guild.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: guild.id } });
		if (!guildSettingsInfoLogs?.guildUpdateLog || !guildSettingsInfoLogs?.infoLogChannel) return;

		const infoLogChannel = guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.GuildUpdate, guild);

		return this.container.client.emit('guildLogCreate', infoLogChannel, this.generateGuildLog(oldGuild, guild, auditLogEntry));
	}

	private generateGuildLog(oldGuild: Guild, guild: Guild, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Server Updated')
			.setDescription(guild.name)
			.setThumbnail(guild.iconURL())
			.setFooter({ text: `Guild ID: ${guild.id}` })
			.setType(Events.GuildUpdate);

		// Name
		if (oldGuild.name !== guild.name) {
			embed.addFields({ name: 'Name Changed', value: `\`\`\`diff\n-${oldGuild.name}\n+${guild.name}\n\`\`\``, inline: false });
		}

		// AFK Voice Channel
		if ((oldGuild.afkChannel || guild.afkChannel) && (oldGuild.afkChannel !== guild.afkChannel)) {
			const oldGuildLink = `${oldGuild.afkChannel?.toString()}`;
			const guildLink = `${guild.afkChannel?.toString()}`;
			if (!oldGuild.afkChannel) embed.addFields({ name: 'AFK Voice Channel Set', value: guildLink, inline: true });
			if (!guild.afkChannel) embed.addFields({ name: 'AFK Voice Channel Removed', value: oldGuildLink, inline: true });
			if (oldGuild.afkChannel && guild.afkChannel) embed.addFields({ name: 'AFK Voice Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// AFK Voice Timeout
		if ((oldGuild.afkTimeout || guild.afkTimeout) && (oldGuild.afkTimeout !== guild.afkTimeout)) {
			if (!oldGuild.afkTimeout) embed.addFields({ name: 'AFK Voice Timeout Set', value: new DurationFormatter().format(seconds(guild.afkTimeout)), inline: true });
			if (!guild.afkTimeout) embed.addFields({ name: 'AFK Voice Timeout Changed', value: 'Disabled', inline: true });
			if (oldGuild.afkTimeout && guild.afkTimeout) embed.addFields({ name: 'AFK Voice Timeout Changed', value: `${new DurationFormatter().format(seconds(oldGuild.afkTimeout))} -> ${new DurationFormatter().format(seconds(oldGuild.afkTimeout))}`, inline: true });
		}

		// System Messages Channel
		if ((oldGuild.systemChannel || guild.systemChannel) && (oldGuild.systemChannel !== guild.systemChannel)) {
			const oldGuildLink = `${oldGuild.systemChannel?.toString()}`;
			const guildLink = `${guild.systemChannel?.toString()}`;
			if (!oldGuild.systemChannel) embed.addFields({ name: 'System Message Channel Set', value: guildLink, inline: true });
			if (!guild.systemChannel) embed.addFields({ name: 'System Message Channel Removed', value: oldGuildLink, inline: true });
			if (oldGuild.systemChannel && guild.systemChannel) embed.addFields({ name: 'System Message Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// System Messages Channel Flags
		if (oldGuild.systemChannelFlags !== guild.systemChannelFlags) {
			const added = guild.systemChannelFlags.toArray().filter((item) => !oldGuild.systemChannelFlags.toArray().includes(item));
			const removed = oldGuild.systemChannelFlags.toArray().filter((item) => !guild.systemChannelFlags.toArray().includes(item));

			// NOTE: All flags on System Messages Channel are negative boolean checks
			// So "added" means they're disabled
			const lines = [];
			if (added.length || removed.length) {
				for (const flag of added) {
					const bit = SystemChannelFlagsBitField.resolve(flag);
					lines.push(`-${getSystemChannelFlagString(bit)}`);
				}
				for (const flag of removed) {
					const bit = SystemChannelFlagsBitField.resolve(flag);
					lines.push(`+${getSystemChannelFlagString(bit)}`);
				}
			}
			if (lines.length) embed.addFields({ name: 'System Messages Changed', value: `\`\`\`diff\n${lines.join('\n')}\n\`\`\``, inline: false });
		}

		// Default Notification Settings
		if (oldGuild.defaultMessageNotifications !== guild.defaultMessageNotifications) {
			const defaultMessageNotifications = ['All messages', 'Only @mentions'];
			embed.addFields({ name: 'Default Notifications Changed', value: `${defaultMessageNotifications[oldGuild.defaultMessageNotifications]} -> ${defaultMessageNotifications[guild.defaultMessageNotifications]}`, inline: false });
		}

		// Boost Progress Bar
		if (oldGuild.premiumProgressBarEnabled !== guild.premiumProgressBarEnabled) {
			embed.addFields({ name: 'Boost Progress Bar', value: `${guild.premiumProgressBarEnabled ? '' : 'Not '}Shown`, inline: true });
		}

		// Banner Image
		if (oldGuild.banner !== guild.banner) {
			const oldGuildLink = oldGuild.banner ? oldGuild.bannerURL() : null;
			const guildLink = guild.banner ? guild.bannerURL() : null;
			if (!oldGuild.banner) embed.addFields({ name: 'Server Banner Added', value: `[New Banner Image](${guildLink})`, inline: true });
			if (!guild.banner) embed.addFields({ name: 'Server Banner Changed', value: 'Banner Removed', inline: true });
			if (oldGuild.banner && guild.banner) embed.addFields({ name: 'Server Banner Changed', value: `[Old Banner Image](${oldGuildLink}) -> [New Banner Image](${guildLink})`, inline: true });
		}

		// Invite Background/Splash Screen
		if (oldGuild.splash !== guild.splash) {
			const oldGuildLink = oldGuild.splash ? oldGuild.splashURL() : null;
			const guildLink = guild.splash ? guild.splashURL() : null;
			if (!oldGuild.splash) embed.addFields({ name: 'Invite Background Added', value: `[New Invite Background](${guildLink})`, inline: true });
			if (!guild.splash) embed.addFields({ name: 'Invite Background Changed', value: 'Invite Background Removed', inline: true });
			if (oldGuild.splash && guild.splash) embed.addFields({ name: 'Invite Background Changed', value: `[Old Invite Background](${oldGuildLink}) -> [New Invite Background](${guildLink})`, inline: true });
		}

		// Server Widget
		if (oldGuild.widgetEnabled !== null && oldGuild.widgetEnabled !== guild.widgetEnabled) {
			embed.addFields({ name: 'Server Widget Status', value: `Widget ${guild.widgetEnabled ? 'Enabled' : 'Disabled'}`, inline: true });
		}

		// Server Widget Channel
		if (oldGuild.widgetChannel !== guild.widgetChannel) {
			const oldGuildLink = oldGuild.widgetChannelId ? `${oldGuild.widgetChannel?.toString()}` : null;
			const guildLink = guild.widgetChannelId ? `${guild.widgetChannel?.toString()}` : null;
			if (!oldGuild.widgetChannel) embed.addFields({ name: 'Server Widget Channel Selected', value: `${guildLink}`, inline: true });
			if (!guild.widgetChannel) embed.addFields({ name: 'Server Widget Channel Changed', value: 'Disabled', inline: true });
			if (oldGuild.widgetChannel && guild.widgetChannel) embed.addFields({ name: 'Server Widget Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// Custom Invite Link
		if (oldGuild.vanityURLCode !== guild.vanityURLCode) {
			const oldGuildLink = oldGuild.vanityURLCode ? `discord.gg/${oldGuild.vanityURLCode}` : null;
			const guildLink = guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : null;
			if (!oldGuild.vanityURLCode) embed.addFields({ name: 'Custom Invite Link Added', value: `${guildLink}`, inline: true });
			if (!guild.vanityURLCode) embed.addFields({ name: 'Custom Invite Link Changed', value: 'Disabled', inline: true });
			if (oldGuild.vanityURLCode && guild.vanityURLCode) embed.addFields({ name: 'Custom Invite Link Changed', value: `\`\`\`diff\n-${oldGuildLink}\n+${guildLink}\n\`\`\``, inline: true });
		}

		// User Verification Level
		if (oldGuild.verificationLevel !== guild.verificationLevel) {
			const verificationLevel = ['', 'Low', 'Medium', 'High', 'Highest'];
			if (!oldGuild.verificationLevel) embed.addFields({ name: 'User Verification Level Added', value: `${verificationLevel[guild.verificationLevel]}`, inline: true });
			if (!guild.verificationLevel) embed.addFields({ name: 'User Verification Level Changed', value: 'Disabled', inline: true });
			if (oldGuild.verificationLevel && guild.verificationLevel) embed.addFields({ name: 'User Verification Level Changed', value: `\`\`\`diff\n-${verificationLevel[oldGuild.verificationLevel]}\n+${verificationLevel[guild.verificationLevel]}\n\`\`\``, inline: true });
		}

		// Explicit Content Filter
		if (oldGuild.explicitContentFilter !== guild.explicitContentFilter) {
			const explicitContentFilter = ['Do not filter', 'Filter for members without roles', 'Filter for all members'];
			if (oldGuild.explicitContentFilter !== null && guild.explicitContentFilter !== null) embed.addFields({ name: 'Explicit Content Filter Changed', value: `\`\`\`diff\n-${explicitContentFilter[oldGuild.explicitContentFilter]}\n+${explicitContentFilter[guild.explicitContentFilter]}\n\`\`\``, inline: true });
		}

		// Moderator 2FA Requirement
		if (oldGuild.mfaLevel !== guild.mfaLevel) {
			embed.addFields({ name: 'Moderator 2FA Requirement Changed', value: `${guild.mfaLevel ? 'Enabled' : 'Disabled'}`, inline: true });
		}

		// Server Rules Channel
		if (oldGuild.rulesChannel !== guild.rulesChannel) {
			const oldGuildLink = oldGuild.rulesChannelId ? `${oldGuild.rulesChannel?.toString()}` : null;
			const guildLink = guild.rulesChannelId ? `${guild.rulesChannel?.toString()}` : null;
			if (!oldGuild.rulesChannel) embed.addFields({ name: 'Server Rules Channel Set', value: `${guildLink}`, inline: true });
			if (!guild.rulesChannel) embed.addFields({ name: 'Server Rules Channel Changed', value: 'Disabled', inline: true });
			if (oldGuild.rulesChannel && guild.rulesChannel) embed.addFields({ name: 'Server Rules Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// Community Updates Channel
		if (oldGuild.publicUpdatesChannel !== guild.publicUpdatesChannel) {
			const oldGuildLink = oldGuild.publicUpdatesChannelId ? `${oldGuild.publicUpdatesChannel?.toString()}` : null;
			const guildLink = guild.publicUpdatesChannelId ? `${guild.publicUpdatesChannel?.toString()}` : null;
			if (!oldGuild.publicUpdatesChannel) embed.addFields({ name: 'Community Updates Channel Set', value: `${guildLink}`, inline: true });
			if (!guild.publicUpdatesChannel) embed.addFields({ name: 'Community Updates Channel Changed', value: 'Disabled', inline: true });
			if (oldGuild.publicUpdatesChannel && guild.publicUpdatesChannel) embed.addFields({ name: 'Community Updates Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// Safety Alerts Channel
		if (oldGuild.safetyAlertsChannel !== guild.safetyAlertsChannel) {
			const oldGuildLink = oldGuild.safetyAlertsChannelId ? `${oldGuild.safetyAlertsChannel?.toString()}` : null;
			const guildLink = guild.safetyAlertsChannelId ? `${guild.safetyAlertsChannel?.toString()}` : null;
			if (!oldGuild.safetyAlertsChannel) embed.addFields({ name: 'Safety Alerts Channel Set', value: `${guildLink}`, inline: true });
			if (!guild.safetyAlertsChannel) embed.addFields({ name: 'Safety Alerts Channel Changed', value: 'Disabled', inline: true });
			if (oldGuild.safetyAlertsChannel && guild.safetyAlertsChannel) embed.addFields({ name: 'Safety Alerts Channel Changed', value: `${oldGuildLink} -> ${guildLink}`, inline: true });
		}

		// Primary Language
		if (oldGuild.preferredLocale !== guild.preferredLocale) {
			embed.addFields({ name: 'Server Primary Language Changed', value: `${oldGuild.preferredLocale} -> ${guild.preferredLocale}`, inline: true });
		}

		// Description
		if (oldGuild.description !== guild.description) {
			if (!oldGuild.description) embed.addFields({ name: 'Server Description Added', value: guild.description as string, inline: true });
			if (!guild.description) embed.addFields({ name: 'Server Description Removed', value: oldGuild.description as string, inline: true });
			if (oldGuild.description && guild.description) embed.addFields({ name: 'Server Description Changed', value: `\`\`\`diff\n-${oldGuild.description}\n+${guild.description}\n\`\`\``, inline: false });
		}

		// Partnered Status
		if (oldGuild.partnered !== guild.partnered) {
			embed.addFields({ name: 'Server Partnered Status Changed', value: `${guild.partnered ? '' : 'Not '}Partnered`, inline: true });
		}

		// Server Owner
		if (oldGuild.ownerId !== guild.ownerId) {
			embed.addFields({ name: 'Server Owner Changed', value: `<@${oldGuild.ownerId}> -> <@${guild.ownerId}>`, inline: false });
		}

		if (oldGuild.features !== guild.features) {
			// TODO: Guild Feature Flags
		}


		// Add audit log info to embed
		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Edited By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return embed.data.fields?.length ? [embed] : [];
	}

}
