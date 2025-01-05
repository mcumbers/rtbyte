import { getPermissionString } from "#utils/util";
import { container } from "@sapphire/framework";
import { GuildMember, PermissionsBitField } from "discord.js";


export function isGuildOwner(member: GuildMember) {
	return member.id === member.guild.ownerId;
}

export async function isAdmin(member: GuildMember) {
	const isOwner = isGuildOwner(member);
	const isAdmin = await hasAdminRole(member);

	return isOwner || isAdmin;
}

export async function isModerator(member: GuildMember) {
	const isOwner = isGuildOwner(member);
	const isAdmin = await hasAdminRole(member);
	const isMod = await hasModrole(member);

	return isOwner || isAdmin || isMod;
}

export async function hasModrole(member: GuildMember) {
	const { prisma } = container;
	const guildSettings = await prisma.guildSettings.fetch(member.guild.id);
	if (!guildSettings) throw new Error('Guild Settings do not exist in database.');

	return member.roles.cache.hasAny(...guildSettings.moderatorRoles) || false;
}

export async function hasAdminRole(member: GuildMember) {
	const { prisma } = container;
	const guildSettings = await prisma.guildSettings.fetch(member.guild.id);
	if (!guildSettings) throw new Error('Guild Settings do not exist in database.');

	return member.roles.cache.hasAny(...guildSettings.adminRoles) || false;
}

export function checkRoleHierarchy(member: GuildMember, executor: GuildMember) {
	return member.roles.highest.position < executor.roles.highest.position;
}

export function getPermissionDifference(oldPermissions: PermissionsBitField, permissions: PermissionsBitField) {
	const added = oldPermissions.missing(permissions).map(perm => getPermissionString(perm));
	const removed = permissions.missing(oldPermissions).map(perm => getPermissionString(perm));
	const differences = {
		added,
		removed
	}

	return differences;
}
