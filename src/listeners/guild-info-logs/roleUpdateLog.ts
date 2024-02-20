import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { getPermissionDifference } from '#utils/functions/permissions';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, Role, type GuildAuditLogsEntry } from 'discord.js';

const ROLE_UPDATE_COOLDOWN = 5 * 1000;

@ApplyOptions<ListenerOptions>({ event: Events.GuildRoleUpdate })
export class UserEvent extends Listener {
	public async run(oldRole: Role, role: Role) {
		if (isNullish(role.id)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.findUnique({ where: { id: role.guild.id } });
		if (!guildSettingsInfoLogs?.roleUpdateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		/*
		// Role Updates are SUPER finnicky...
		// Making multiple changes in Discord's native UI can fire the exact same Role Update event multiple times.
		// Because of this, I've implemented a per-role cooldown for updates, and that means tracking them in a container-wide collection.
		*/
		const roleUpdate = this.container.liveCache.roleUpdates.get(role.id);
		if (roleUpdate && ((roleUpdate.lastUpdated as number + ROLE_UPDATE_COOLDOWN) > Date.now())) return;
		this.container.liveCache.roleUpdates.set(role.id, { id: role.id, lastUpdated: Date.now() });

		const logChannel = role.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.RoleUpdate, role.guild, role);

		return this.container.client.emit('guildLogCreate', logChannel, await this.generateGuildLog(oldRole, role, auditLogEntry));
	}

	private async generateGuildLog(oldRole: Role, role: Role, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Role Updated')
			.setDescription(`${role.toString()}`)
			.setThumbnail(role.icon ? role.iconURL() ?? role.guild.iconURL() : role.guild.iconURL())
			.setFooter({ text: `Role ID: ${role.id}` })
			.setType(Events.GuildRoleUpdate);

		// Name
		if (oldRole.name !== role.name) {
			embed.addFields({ name: 'Name Changed', value: `\`\`\`diff\n-${oldRole.name}\n+${role.name}\n\`\`\``, inline: false });
		}

		// Color
		if (oldRole.color !== role.color) {
			if (!oldRole.color) embed.addFields({ name: 'Color Added', value: `${role.hexColor}`, inline: true });
			if (!role.color) embed.addFields({ name: 'Color Removed', value: `${oldRole.hexColor}`, inline: true });
			if (oldRole.color && role.color) embed.addFields({ name: 'Color Changed', value: `\`\`\`diff\n-${oldRole.hexColor}\n+${role.hexColor}\n\`\`\``, inline: false });
		}

		// Icon
		if (oldRole.icon !== role.icon) {
			if (!oldRole.icon) embed.addFields({ name: 'Icon Added', value: `[New Icon](${role.iconURL()})`, inline: true });
			if (!role.icon) embed.addFields({ name: 'Icon Changed', value: 'Icon Removed', inline: true });
			if (oldRole.icon && role.icon) embed.addFields({ name: 'Icon Changed', value: `[New Icon](${role.iconURL()})`, inline: false });
		}

		// Hoisted
		if (oldRole.hoist !== role.hoist) embed.addFields({ name: 'Role Display Changed', value: `${oldRole.hoist ? 'Not ' : ''}Separated`, inline: true });
		// Mentionable
		if (oldRole.mentionable !== role.mentionable) embed.addFields({ name: 'Role Status Changed', value: `${oldRole.mentionable ? 'Not ' : ''}Mentionable`, inline: true });

		// Permissions
		if (oldRole.permissions !== role.permissions) {
			const permDifferences = getPermissionDifference(oldRole.permissions, role.permissions);
			if (permDifferences.added.length || permDifferences.removed.length) {
				embed.addFields({ name: 'Permissions Changed', value: `\`\`\`diff\n${[...permDifferences.added.map((str) => `+ ${str}`), ...permDifferences.removed.map((str) => `- ${str}`)].join('\n')}\n\`\`\``, inline: false });
			}
		}

		// Integrations & features
		if (oldRole.tags !== role.tags) {
			// Associated Bot
			if ((oldRole.tags?.botId !== role.tags?.botId) && (oldRole.tags?.botId || role.tags?.botId)) {
				if (!oldRole.tags?.botId) embed.addFields({ name: 'Role Association Added', value: `<@${role.tags?.botId}>`, inline: true });
				if (!role.tags?.botId) embed.addFields({ name: 'Role Association Removed', value: `<@${oldRole.tags?.botId}>`, inline: true });
				if (oldRole.tags?.botId && role.tags?.botId) embed.addFields({ name: 'Role Association Changed', value: `<@${oldRole.tags?.botId}> -> <@${role.tags?.botId}>`, inline: false });
			}

			// Integration
			if ((oldRole.tags?.integrationId !== role.tags?.integrationId) && (oldRole.tags?.integrationId || role.tags?.integrationId)) {
				const integrations = await role.guild.fetchIntegrations();
				const oldIntegration = integrations.find((ign) => ign.id === oldRole.tags?.integrationId);
				const integration = integrations.find((ign) => ign.id === role.tags?.integrationId);

				if (!oldIntegration) embed.addFields({ name: 'Role Integration Added', value: `${integration?.name}`, inline: true });
				if (!integration) embed.addFields({ name: 'Role Integration Removed', value: `${oldIntegration?.name}`, inline: true });
				if (oldIntegration && integration) embed.addFields({ name: 'Role Integration Changed', value: `${oldIntegration?.name} -> ${integration?.name}`, inline: false });
			}

			// Server Booster
			if ((oldRole.tags?.premiumSubscriberRole !== role.tags?.premiumSubscriberRole) && (oldRole.tags?.premiumSubscriberRole || role.tags?.premiumSubscriberRole)) {
				embed.addFields({ name: 'Role Type Changed', value: `${oldRole.tags?.premiumSubscriberRole ? 'Not ' : ''}Server Booster Role`, inline: true });
			}

			// Guild Linked Role
			if ((oldRole.tags?.guildConnections !== role.tags?.guildConnections) && (oldRole.tags?.guildConnections || role.tags?.guildConnections)) {
				embed.addFields({ name: 'Role Type Changed', value: `${oldRole.tags?.guildConnections ? 'Not ' : ''}Server Linked Role`, inline: true });
			}

			// Purchasable Role
			if ((oldRole.tags?.availableForPurchase !== role.tags?.availableForPurchase) && (oldRole.tags?.availableForPurchase || role.tags?.availableForPurchase)) {
				embed.addFields({ name: 'Role Type Changed', value: `${oldRole.tags?.availableForPurchase ? 'Not ' : ''}Purchasable Role`, inline: true });
			}
		}

		// Position Changes
		/* NOTE: This will fire for every role whose position is affected by the first role's move
		// This means moving one role would fill up the log channel
		// So, to address this, we actually just return an empty array if there's no other fields already added to the embed
		// (meaning nothing else changed about this specific role)
		// Unforunately, this means we can't log any time roles are just re-ordered
		// But, just re-ordering roles also isn't shown in the audit log, so I guess that's fair.
		*/
		if (oldRole.position !== role.position) {
			if (!embed.data.fields?.length) return [];
			embed.addFields({ name: 'Role Order Changed', value: `${oldRole.position} -> ${role.position}`, inline: true });
		}

		// Add audit log info to embed
		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Edited By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return embed.data.fields?.length ? [embed] : [];
	}
}
