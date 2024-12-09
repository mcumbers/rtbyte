import { GuildLogEmbed } from "#root/lib/extensions/GuildLogEmbed";
import { CustomEvents } from "#root/lib/util/CustomTypes";
import { getAuditLogEntry } from "#utils/util";
import { ModActionType, type ModAction } from "@prisma/client";
import { container, type Container } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import type { Guild, GuildMember, GuildPreview, User } from "discord.js";
import { AuditLogEvent, Events } from "discord.js";

type ModActionEmbedContext = 'Moderator' | 'Target';

interface ModActionLogEmbedOptions {
	target?: User,
	executor?: User,
	guild?: Guild,
	guildPreview?: GuildPreview,
	targetMember?: GuildMember,
	executorMember?: GuildMember,
	context?: ModActionEmbedContext
}

export class ModActionLogEmbed extends GuildLogEmbed {
	private container: Container;

	public constructor() {
		super();
		this.container = container;
	}

	public async fromModAction(modAction: ModAction, context: ModActionEmbedContext = 'Moderator') {
		const target: User | undefined = await this.container.client.users.fetch(modAction.targetID as string).catch(() => undefined);
		let executor: User | undefined = await this.container.client.users.fetch(modAction.executorID as string).catch(() => undefined);
		const guild: Guild | undefined = await this.container.client.guilds.fetch(modAction.guildID).catch(() => undefined);
		const guildPreview: GuildPreview | undefined = await this.container.client.fetchGuildPreview(modAction.guildID).catch(() => undefined);

		// Hide Executor if building Embed for Target and it was created anonymously
		if (context === 'Target' && modAction.anonymous) {
			executor = undefined;
		}

		let targetMember: GuildMember | undefined;
		let executorMember: GuildMember | undefined;

		// If we can access the guild...
		if (guild) {
			// Try to grab the GuildMember for the target from the cache
			if (!isNullishOrEmpty(modAction.targetID)) {
				targetMember = guild.members.cache.get(modAction.targetID as string);
				// Or try to fetch them from the Guild... If we can't get their GuildMember, just pass undefined
				if (!targetMember) {
					targetMember = await guild.members.fetch(modAction.targetID as string).catch(() => undefined)
				};
			}

			// Do the same for the executor
			if (!isNullishOrEmpty(modAction.executorID)) {
				executorMember = guild.members.cache.get(modAction.executorID as string);
				if (!executorMember) {
					executorMember = await guild.members.fetch(modAction.executorID as string).catch(() => undefined);
				}
			}
		}

		const resources: ModActionLogEmbedOptions = { target, executor, guild, guildPreview, targetMember, executorMember, context };

		switch (modAction.type) {
			case ModActionType.BAN: return this.buildBanEmbed(modAction, resources);
			case ModActionType.UNBAN: return this.buildUnbanEmbed(modAction, resources);
			case ModActionType.KICK: return this.buildKickEmbed(modAction, resources);
			case ModActionType.MUTE: return this.buildMuteEmbed(modAction, resources);
			case ModActionType.UNMUTE: return this.buildUnmuteEmbed(modAction, resources);
			case ModActionType.PURGE: return this.buildPurgeEmbed(modAction, resources);
			case ModActionType.VCBAN: return undefined;
			case ModActionType.VCUNBAN: return undefined;
			case ModActionType.VCKICK: return this.buildVCKickEmbed(modAction, resources);
			case ModActionType.WARN: return this.buildWarnEmbed(modAction, resources);
			case ModActionType.FILTER_CHAT: return undefined;
			case ModActionType.FILTER_NAME: return undefined;
			case ModActionType.FLAG_SPAMMER_ADD: return this.buildFlagSpammerAddEmbed(modAction, resources);
			case ModActionType.FLAG_SPAMMER_REMOVE: return this.buildFlagSpammerRemoveEmbed(modAction, resources);
			case ModActionType.FLAG_QUARANTINE_ADD: return this.buildFlagQuarantineAddEmbed(modAction, resources);
			case ModActionType.FLAG_QUARANTINE_REMOVE: return this.buildFlagQuarantineRemoveEmbed(modAction, resources);

			default: return undefined;
		}
	}

	private async buildBanEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		if (!modAction.targetID) return undefined;

		this.setTitle('User Banned from Server');
		this.setDescription(targetMember ? targetMember.toString() : target ? target.toString() : `<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.addBlankFields({ name: (targetMember || target) ? 'Username' : 'User ID', value: targetMember ? targetMember.user.username : target ? target.username : modAction.targetID, inline: true });
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(Events.GuildBanAdd);

		if (targetMember) {
			this.addBlankFields({ name: '', value: '', inline: true });
			this.addBlankFields({ name: `${targetMember.flags.has("DidRejoin") ? 'Last ' : ''}Joined Server`, value: `<t:${Math.round(targetMember.joinedTimestamp as number / 1000)}:R>`, inline: true });
		}

		const memberData = await this.container.prisma.member.fetchTuple([modAction.targetID, modAction.guildID], ['userID', 'guildID']);

		if (memberData) {
			if (memberData.displayNameHistory.length) {
				// TODO: Limit to last 5 display names?
				const displayNames = `\`\`\`md\n-\t${memberData.displayNameHistory.join('\n-\t')}\n\`\`\``;
				this.addBlankFields({ name: 'Known as', value: displayNames, inline: false });
			}
		}

		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.executorID) this.addBlankFields({ name: 'Banned By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });
		if (modAction.effectiveUntil) this.addBlankFields({ name: 'Banned Until', value: `<t:${Math.round(modAction.effectiveUntil.getTime() / 1000)}:R>`, inline: true });

		return this;
	}

	private async buildUnbanEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		if (!modAction.targetID) return undefined;

		this.setTitle('User Unbanned from Server');
		this.setDescription(targetMember ? targetMember.toString() : target ? target.toString() : `<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.addBlankFields({ name: (targetMember || target) ? 'Username' : 'User ID', value: targetMember ? targetMember.user.username : target ? target.username : modAction.targetID, inline: true });
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(Events.GuildBanRemove);

		if (guild) {
			const banEntries = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd });
			const banEntry = banEntries.entries.find((entry) => entry.targetId === modAction.targetID);

			if (banEntry) {
				const banModAction = await this.container.prisma._prisma.modAction.findFirst({ where: { auditLogID: banEntry.id } });

				if (banModAction) {
					this.addBlankFields({ name: '', value: '', inline: true });
					this.addBlankFields({ name: 'User Banned', value: `<t:${Math.round(banEntry.createdAt.getTime() / 1000)}:R>`, inline: true });
					if (banModAction.reason) this.addBlankFields({ name: 'Ban Reason', value: banEntry.reason ?? undefined, inline: false });
					if (banModAction.executorID) this.addBlankFields({ name: 'Banned By', value: `<@${banModAction.executorID}>`, inline: false });
				}
			}
		}

		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.executorID) this.addBlankFields({ name: 'Unbanned By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private buildKickEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		if (!modAction.targetID) return undefined;

		this.setTitle('User Kicked From Server');
		this.setDescription(targetMember ? targetMember.toString() : target ? target.toString() : `<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.addBlankFields({ name: (targetMember || target) ? 'Username' : 'User ID', value: targetMember ? targetMember.user.username : target ? target.username : modAction.targetID, inline: true });
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionKick);

		if (targetMember) this.addBlankFields({ name: 'Joined Server', value: `<t:${Math.round(targetMember?.joinedTimestamp as number / 1000)}:R>`, inline: true });

		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.executorID) this.addBlankFields({ name: 'Kicked By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private buildMuteEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		if (!modAction.targetID) return undefined;

		this.setTitle('User Timed Out');
		this.setDescription(targetMember ? targetMember.toString() : target ? target.toString() : `<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.addBlankFields({ name: (targetMember || target) ? 'Username' : 'User ID', value: targetMember ? targetMember.user.username : target ? target.username : modAction.targetID, inline: true });
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionMute);

		if (modAction.executorID) this.addBlankFields({ name: 'Timed Out By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: true });
		if (modAction.effectiveUntil) this.addBlankFields({ name: 'Timed Out Until', value: `<t:${Math.round(modAction.effectiveUntil.getTime() / 1000)}:R>`, inline: true });
		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private async buildUnmuteEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		if (!modAction.targetID) return undefined;

		this.setTitle('User Timeout Removed');
		this.setDescription(targetMember ? targetMember.toString() : target ? target.toString() : `<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.addBlankFields({ name: (targetMember || target) ? 'Username' : 'User ID', value: targetMember ? targetMember.user.username : target ? target.username : modAction.targetID, inline: true });
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionUnmute);

		if (guild && target) {
			const auditLogEntry = await getAuditLogEntry(AuditLogEvent.MemberUpdate, guild, target);

			if (auditLogEntry) {
				const muteModAction = await this.container.prisma._prisma.modAction.findFirst({ where: { auditLogID: auditLogEntry.id } });

				if (muteModAction) {
					this.addBlankFields({ name: '', value: '', inline: true });
					if (muteModAction.reason) this.addBlankFields({ name: 'Timeout Reason', value: muteModAction.reason ?? undefined, inline: false });
					if (muteModAction.executorID) this.addBlankFields({ name: 'Timed Out By', value: `<@${muteModAction.executorID}>`, inline: false });
				}
			}
		}

		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.executorID) this.addBlankFields({ name: 'Removed By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private buildPurgeEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		this.setTitle('Messages Purged');
		this.setDescription(`${modAction.messageCount} Messages ${target ? `from ${target.toString()} ` : ''}Deleted`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.setFooter({ text: `Action ID: ${modAction.id}` });
		this.setType(CustomEvents.ModActionPurge);
		this.addBlankFields({ name: 'In Channel', value: `<#${modAction.channelID}>`, inline: false });

		if (modAction.executorID) this.addBlankFields({ name: 'Deleted By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: true });
		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private async buildVCKickEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Kicked From Voice Chat');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.setFooter({ text: `Action ID: ${modAction.id}` });
		this.setType(CustomEvents.ModActionVCKick);
		if (target) this.addBlankFields({ name: 'Username', value: target.username, inline: true })

		if (guild) {
			if (modAction.channelID) {
				const channel = await guild.channels.fetch(modAction.channelID).catch(() => undefined);

				if (channel) {
					this.addBlankFields({ name: 'Channel', value: channel.url as string, inline: true });
				}
			}
		}

		if (modAction.executorID) this.addBlankFields({ name: 'Kicked By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: true });
		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });

		return this;
	}

	private async buildWarnEmbed(modAction: ModAction, { target, executor, guild, guildPreview, targetMember, executorMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Given a Warning');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null);
		this.setFooter({ text: `Action ID: ${modAction.id}` });
		this.setType(CustomEvents.ModActionWarn);
		if (target) this.addBlankFields({ name: 'Username', value: target.username, inline: true })

		if (modAction.executorID) this.addBlankFields({ name: 'Warned By', value: executorMember ? executorMember.toString() : executor ? executor.toString() : `<@${modAction.executorID}>`, inline: true });
		if (modAction.reason) this.addBlankFields({ name: 'Reason', value: modAction.reason, inline: false });
		if (modAction.details) this.addBlankFields({ name: 'Details', value: modAction.details, inline: false });
		return this;
	}

	private buildFlagSpammerAddEmbed(modAction: ModAction, { target, guild, guildPreview, targetMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Marked as Spammer by Discord');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null)
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionFlagSpammerAdd);

		return this;
	}

	private buildFlagSpammerRemoveEmbed(modAction: ModAction, { target, guild, guildPreview, targetMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Un-Marked as Spammer by Discord');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null)
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionFlagSpammerRemove);

		return this;
	}

	private buildFlagQuarantineAddEmbed(modAction: ModAction, { target, guild, guildPreview, targetMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Marked as Quarantined by Discord');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null)
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionFlagQuarantineAdd);

		return this;
	}

	private buildFlagQuarantineRemoveEmbed(modAction: ModAction, { target, guild, guildPreview, targetMember }: ModActionLogEmbedOptions) {
		this.setTitle('User Un-Marked as Quarantined by Discord');
		this.setDescription(`<@${modAction.targetID}>`);
		this.setThumbnail(targetMember ? targetMember.displayAvatarURL() : target ? target.avatarURL() : guild ? guild.iconURL() : guildPreview ? guildPreview.iconURL() : null)
		this.setFooter({ text: `User ID: ${modAction.targetID}` });
		this.setType(CustomEvents.ModActionFlagQuarantineRemove);

		return this;
	}

}
