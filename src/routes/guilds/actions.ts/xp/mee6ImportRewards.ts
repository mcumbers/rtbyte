import { authenticated } from '#root/lib/util/decorators/routeAuthenticated';
import { ApplyOptions } from '@sapphire/decorators';
import { ApiResponse, HttpCodes, Route, methods, type ApiRequest } from '@sapphire/plugin-api';
import { Guild, PermissionsBitField } from 'discord.js';
import fetch from 'node-fetch';

const MEE6_IMPORT_COOLDOWN = 24 * 60 * 60 * 1000;

@ApplyOptions<Route.Options>({
	name: 'mee6ImportRewards',
	route: 'guilds/:guildID/actions/xp/mee6-import-rewards'
})

export class UserRoute extends Route {
	public constructor(context: Route.Context, options: Route.Options) {
		super(context, {
			...options
		});
	}

	@authenticated()
	public async [methods.GET](request: ApiRequest, response: ApiResponse) {
		const requestAuth = request.auth!
		const { client, prisma } = this.container;

		// Fetch the Guild this request is for
		const guild = await client.guilds.fetch(request.params.guildID);
		if (!guild) return response.error(HttpCodes.NotFound);

		// Fetch the GuildMember who sent the request
		const member = await guild.members.fetch(requestAuth.id);
		const canManageServer: boolean = guild.ownerId === member.id || member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
		if (!canManageServer) return response.error(HttpCodes.Forbidden);

		let guildSettingsXP = await prisma.guildSettingsXP.findFirst({ where: { id: guild.id } });
		if (!guildSettingsXP) guildSettingsXP = await prisma.guildSettingsXP.create({ data: { id: guild.id } });

		// 24-hour cooldown for mee6 XP Imports
		if (guildSettingsXP.mee6ImportedTime && new Date(Date.now() + MEE6_IMPORT_COOLDOWN) > guildSettingsXP.mee6ImportedTime) return response.error(HttpCodes.TooManyRequests);
		// Set import time on guildSettingsXP before fetching mee6 data so we don't spam the API if the request fails
		guildSettingsXP = await prisma.guildSettingsXP.update({ where: { id: guildSettingsXP.id }, data: { mee6ImportedTime: new Date(Date.now()) } });

		try {
			// Grab all rank reward entries from mee6 API
			const mee6Rewards = await this.getMee6Rewards(member.guild);

			for await (const entry of mee6Rewards) {
				// TODO: Register Rewards in our own database
				if (entry) continue;
			}

			// Return OK when complete
			return response.ok();
		} catch (error) {
			// VERY naive error handling here...
			// I'm assuming if an error is thrown here it's from node-fetch getting a 404 from mee6
			return response.error(HttpCodes.NotFound);
		}
	}

	private async getMee6Rewards(guild: Guild) {
		const entries: Mee6RankReward[] = [];
		const response = await fetch(`https://mee6.xyz/api/plugins/levels/leaderboard/${guild.id}?limit=1`);
		const data = await response.json() as Mee6Data;
		entries.push(...data.role_rewards);
		return entries;
	}

}

interface Mee6PlayerData {
	avatar: string,
	detailed_xp: number[],
	discriminator: string,
	guild_id: string,
	id: string,
	is_monetize_subscriber: boolean,
	level: number,
	message_count: number,
	monetize_xp_boost: number,
	username: string,
	xp: number
}

interface Mee6RankReward {
	rank: number,
	role: {
		color: number,
		hoist: boolean,
		icon: string,
		id: string,
		managed: boolean,
		mentionable: boolean,
		name: string,
		permissions: number,
		position: number,
		unicode_emoji: string
	}
}

interface Mee6Guild {
	allow_join: boolean,
	application_commands_enabled: boolean,
	commands_prefix: boolean,
	icon: string,
	id: string,
	invite_leaderboard: boolean,
	leaderboard_url: string,
	name: string,
	premium: boolean
}

interface Mee6Data {
	admin: boolean,
	banner_url: string,
	country: string,
	guild: Mee6Guild,
	is_member: boolean,
	monetize_options: {
		display_plans: boolean,
		showcase_subscribers: boolean
	},
	page: number,
	player: null,
	players: Mee6PlayerData[],
	role_rewards: Mee6RankReward[],
	user_guild_settings: null,
	xp_per_message: number[],
	xp_rate: number
}
