import { GuildLogEmbed } from '#lib/extensions/GuildLogEmbed';
import { CustomEvents } from '#utils/CustomTypes';
import { getPermissionDifference } from '#utils/functions/permissions';
import { getAuditLogEntry } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { AuditLogEvent, BaseGuildTextChannel, GuildAuditLogsEntry, PermissionsBitField, Role } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.GuildRoleCreate })
export class UserEvent extends Listener {
	public async run(role: Role) {
		if (isNullish(role.id)) return;
		if (isNullish(role.guild)) return;

		const guildSettingsInfoLogs = await this.container.prisma.guildSettingsInfoLogs.fetch(role.guild.id);
		if (!guildSettingsInfoLogs?.roleCreateLog || !guildSettingsInfoLogs.infoLogChannel) return;

		const logChannel = role.guild.channels.resolve(guildSettingsInfoLogs.infoLogChannel) as BaseGuildTextChannel;
		const auditLogEntry = await getAuditLogEntry(AuditLogEvent.RoleCreate, role.guild, role);

		return this.container.client.emit(CustomEvents.GuildLogCreate, logChannel, await this.generateGuildLog(role, auditLogEntry));
	}

	private async generateGuildLog(role: Role, auditLogEntry: GuildAuditLogsEntry | null) {
		const embed = new GuildLogEmbed()
			.setTitle('Role Created')
			.setDescription(`${role.toString()}`)
			.setThumbnail(role.icon ? role.iconURL() ?? role.guild.iconURL() : role.guild.iconURL())
			.setFooter({ text: `Role ID: ${role.id}` })
			.setType(Events.GuildRoleCreate);

		if (role.color) embed.addFields({ name: 'Color', value: `${role.hexColor}`, inline: true });
		if (role.unicodeEmoji) embed.addFields({ name: 'Emoji', value: role.unicodeEmoji as string, inline: true });
		if (role.hoist) embed.addFields({ name: 'Role Display', value: 'Separated', inline: true });
		if (role.mentionable) embed.addFields({ name: 'Role Status', value: 'Mentionable', inline: true });

		if (role.tags) {
			if (role.tags.botId) embed.addFields({ name: 'Bot Role For', value: `<@${role.tags.botId}>`, inline: true });

			if (role.tags.integrationId) {
				const integrations = await role.guild.fetchIntegrations();
				const integration = integrations.find((ign) => ign.id === role.tags?.integrationId);
				if (integration) embed.addFields({ name: 'Integration Role For', value: integration?.name as string, inline: true });
			}

			if (role.tags.premiumSubscriberRole) embed.addFields({ name: 'Role Type', value: 'Server Booster Role', inline: true });
			if (role.tags.guildConnections) embed.addFields({ name: 'Role Type', value: 'Server Linked Role', inline: true });
			if (role.tags.availableForPurchase) embed.addFields({ name: 'Role Type', value: 'Purchasable Role', inline: true });
		}

		const permDifferences = getPermissionDifference(new PermissionsBitField, role.permissions);
		// Role permissions are binary, and always default to not-granted when created
		// So we only have to show "granted" permissions here. These should only appear if created by an app.
		if (permDifferences.added.length) {
			embed.addFields({ name: 'Permissions', value: `\`\`\`diff\n${[...permDifferences.added.map((str) => `+ ${str}`)].join('\n')}\n\`\`\``, inline: false });
		}

		if (auditLogEntry) {
			if (!isNullish(auditLogEntry.reason)) embed.addFields({ name: 'Reason', value: auditLogEntry.reason, inline: false });
			if (!isNullish(auditLogEntry.executor)) embed.addFields({ name: 'Created By', value: auditLogEntry.executor.toString(), inline: false });
		}

		return [embed]
	}
}
