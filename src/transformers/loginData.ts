import { container } from '@sapphire/framework';
import type { LoginData } from '@sapphire/plugin-api';
import { type APIUser, type ClientUser, type RESTAPIPartialCurrentUserGuild, type RESTGetAPICurrentUserResult } from 'discord.js';
interface TransformedLoginData extends LoginData {
	transformedGuilds?: (RESTAPIPartialCurrentUserGuild & { botInGuild: boolean })[] | null;
	transformedUser?: (RESTGetAPICurrentUserResult & { isBotOwner: boolean }) | null;
	bot?: (ClientUser) | null;
}

export async function transformLoginData(loginData: LoginData): Promise<TransformedLoginData> {
	const { client, prisma } = container;

	const transformedGuilds = loginData.guilds?.map((guild) => {
		const cachedGuild = client.guilds.cache.get(guild.id);
		const canManageServer: boolean = guild.owner || ((parseInt(guild.permissions, 10) & 0x20) !== 0) || ((parseInt(guild.permissions, 10) & 0x8) !== 0);

		return {
			...guild,
			botInGuild: typeof cachedGuild !== 'undefined',
			canManageServer
		};
	});

	const botGlobalSettings = await prisma.botGlobalSettings.fetch(client.id as string);

	const transformedUser = {
		...loginData.user as APIUser,
		isBotOwner: loginData?.user?.id ? botGlobalSettings?.botOwners.includes(loginData.user.id) : false
	};

	loginData.guilds = transformedGuilds;
	loginData.user = transformedUser;
	return { ...loginData, bot: client.user as ClientUser };
}
