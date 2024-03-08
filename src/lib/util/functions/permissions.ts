import { getPermissionString } from "#utils/util";
import { container } from "@sapphire/framework";
import { GuildMember, PermissionsBitField } from "discord.js";


export function isGuildOwner(member: GuildMember) {
	return member.id === member.guild.ownerId;
}

export async function isAdmin(member: GuildMember) {
	return isGuildOwner(member) || hasAdminRole(member);
}

export async function isModerator(member: GuildMember) {
	return isGuildOwner(member) || hasAdminRole(member) || hasModrole(member);
}

export async function hasModrole(member: GuildMember) {
	const { prisma } = container;
	const guildSettings = await prisma.guildSettings.fetch(member.guild.id);

	let hasModRole = false;
	if (guildSettings?.moderatorRoles) {
		for await (const modRoleID of guildSettings?.moderatorRoles) {
			if (member.roles.cache.has(modRoleID)) hasModRole = true;
		}
	}

	return hasModRole;
}

export async function hasAdminRole(member: GuildMember) {
	const { prisma } = container;
	const guildSettings = await prisma.guildSettings.fetch(member.guild.id);

	let hasAdminRole = false;
	if (guildSettings?.adminRoles) {
		for await (const adminRoleID of guildSettings?.adminRoles) {
			if (member.roles.cache.has(adminRoleID)) hasAdminRole = true;
		}
	}
	return hasAdminRole;
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
