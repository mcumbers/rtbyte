import { container } from '@sapphire/framework';
import { bold, gray } from 'colorette';
import { Guild, GuildMember, User } from "discord.js";

export async function initializeGuild(guild: Guild) {
	const { logger, prisma, client } = container;
	const clientSettings = await prisma.clientSettings.findFirst();

	// Fetch Owner's User so it's in cache
	const owner = await client.users.fetch(guild.ownerId);

	if (clientSettings?.guildBlacklist.includes(guild.id)) {
		await guild.leave();
		logger.debug(`Guild ${bold(guild.name)} (${gray(guild.id)}) is on the guild blacklist, leaving...`);
	}

	if (clientSettings?.userBlacklist.includes(owner.id)) {
		await guild.leave();
		logger.debug(`Guild ${bold(guild.name)} (${gray(guild.id)}) is owned by user (${owner.id}) on global blacklist, leaving...`);
	}

	// Check if entry exists for guild. If not, create it
	let guildInfo = await prisma.guild.findUnique({ where: { id: guild.id } });
	let guildSettings = await prisma.guildSettings.findUnique({ where: { id: guild.id } });
	let guildSettingsChatFilter = await prisma.guildSettingsChatFilter.findUnique({ where: { id: guild.id } });
	let guildSettingsLogs = await prisma.guildSettingsInfoLogs.findUnique({ where: { id: guild.id } });
	let guildSettingsModActions = await prisma.guildSettingsModActions.findUnique({ where: { id: guild.id } });

	if (!guildInfo || !guildSettings || !guildSettingsChatFilter || !guildSettingsLogs || !guildSettingsModActions) {
		logger.debug(`Initializing guild ${bold(guild.name)} (${gray(guild.id)})...`)

		if (!guildInfo) {
			guildInfo = await prisma.guild.create({
				data: {
					id: guild.id
				}
			}).catch(e => {
				logger.error(`Failed to initialize guild info for ${bold(guild.name)} (${gray(guild.id)}), error below.`);
				logger.error(e);
				return null;
			});
		}

		if (!guildSettings) {
			guildSettings = await prisma.guildSettings.create({
				data: {
					id: guild.id
				}
			}).catch(e => {
				logger.error(`Failed to initialize guildSettings for ${bold(guild.name)} (${gray(guild.id)}), error below.`);
				logger.error(e);
				return null;
			});
		}

		if (!guildSettingsChatFilter) {
			guildSettingsChatFilter = await prisma.guildSettingsChatFilter.create({
				data: {
					id: guild.id
				}
			}).catch(e => {
				logger.error(`Failed to initialize guildSettingsChatFilter for ${bold(guild.name)} (${gray(guild.id)}), error below.`);
				logger.error(e);
				return null;
			});
		}

		if (!guildSettingsLogs) {
			guildSettingsLogs = await prisma.guildSettingsInfoLogs.create({
				data: {
					id: guild.id
				}
			}).catch(e => {
				logger.error(`Failed to initialize guildSettingsLogs for ${bold(guild.name)} (${gray(guild.id)}), error below.`);
				logger.error(e);
				return null;
			});
		}

		if (!guildSettingsModActions) {
			guildSettingsModActions = await prisma.guildSettingsModActions.create({
				data: {
					id: guild.id
				}
			}).catch(e => {
				logger.error(`Failed to initialize guildSettingsModActions for ${bold(guild.name)} (${gray(guild.id)}), error below.`);
				logger.error(e);
				return null;
			});
		}

	}

	logger.debug(`Verified initialization of guild ${bold(guild.name)} (${gray(guild.id)})`);
	return { guildInfo, guildSettings, guildSettingsChatFilter, guildSettingsLogs, guildSettingsModActions };
}

export async function initializeUser(user?: User, userID?: string) {
	const { logger, prisma } = container;
	if (!user && !userID) {
		logger.error(`Failed to initialize user info. No user identifier specified.`);
		return null;
	}

	const clientSettings = await prisma.clientSettings.findFirst();

	if (user || !userID) userID = user?.id;

	logger.debug(`Initializing user ${user ? bold(user.username) : '...'} (${gray(userID!)})...`);

	if (clientSettings?.userBlacklist.includes(userID!)) logger.debug(`User ${user ? bold(user.username) : '...'} (${gray(userID!)}) is on the user blacklist...`);

	const userInfo = await prisma.user.findUnique({ where: { id: userID } });
	const userSettings = await prisma.userSettings.findUnique({ where: { id: userID } });

	if (!userInfo) {
		await prisma.user.create({
			data: {
				id: userID!
			}
		}).catch(e => {
			logger.error(`Failed to initialize user info for ${user ? bold(user.username) : '...'} (${gray(userID!)}), error below.`);
			logger.error(e);
			return null;
		});
	}

	if (!userSettings) {
		await prisma.userSettings.create({
			data: {
				id: userID!
			}
		}).catch(e => {
			logger.error(`Failed to initialize user settings for ${user ? bold(user.username) : '...'} (${gray(userID!)}), error below.`);
			logger.error(e);
			return null;
		});
	}

	logger.debug(`Verified initialization of user ${user ? bold(user.username) : '...'} (${gray(userID!)})`);
	return { userInfo, userSettings };
}

export async function initializeMember(user: User, guild: Guild, member?: GuildMember) {
	const { logger, prisma } = container;
	await initializeUser(user);
	const clientSettings = await prisma.clientSettings.findFirst({ where: { id: container.client.id as string } });

	logger.debug(`Initializing member ${bold(user.username)} (${gray(user.id)}) in guild ${bold(guild.name)} (${gray(guild.id)})...`);

	if (clientSettings?.userBlacklist.includes(user.id)) logger.debug(`User ${bold(user.username)} (${gray(user.id)}) is on the user blacklist...`);

	if (!member) member = await guild.members.fetch(user.id);
	let memberInfo = await prisma.member.findFirst({ where: { userID: user.id, guildID: guild.id } });

	if (!memberInfo) {
		const joinTimes: Date[] = [];

		if (member && member.joinedAt) joinTimes.push(member.joinedAt);
		memberInfo = await prisma.member.create({
			data: {
				userID: `${user.id}`,
				guildID: `${guild.id}`,
				joinTimes
			}
		}).catch(e => {
			logger.error(`Failed to initialize member info for ${bold(user.username)} (${gray(user.id)}) in guild ${bold(guild.name)} (${gray(guild.id)}), error below.`);
			logger.error(e);
			return null;
		});
	}

	if (member && member.joinedAt && !memberInfo?.joinTimes.includes(member.joinedAt)) {
		const dbJoinTimes = memberInfo?.joinTimes || [];
		dbJoinTimes.push(member.joinedAt);

		memberInfo = await prisma.member.update({
			where: {
				id: memberInfo?.id
			},
			data: {
				joinTimes: dbJoinTimes
			}
		});
	}

	logger.debug(`Verified initialization of member ${bold(user.username)} (${gray(user.id)}) in guild ${bold(guild.name)} (${gray(guild.id)})`);
	return { memberInfo };
}