import { authenticated } from '#root/lib/util/decorators/routeAuthenticated';
import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, Route, methods, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { PermissionsBitField } from 'discord.js';

@ApplyOptions<Route.Options>({
	name: 'guildMembers',
	route: 'guilds/:guildID/members'
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
		const { client } = this.container;

		// Fetch the Guild this request is for
		const guild = await client.guilds.fetch(request.params.guildID);
		if (!guild) return response.error(HttpCodes.NotFound);

		// Fetch the GuildMember who sent the request
		const member = await guild.members.fetch(requestAuth.id);
		const canManageServer: boolean = guild.ownerId === member.id || member.permissions.has(PermissionsBitField.Flags.ManageGuild) || member.permissions.has(PermissionsBitField.Flags.Administrator);
		if (!canManageServer) return response.error(HttpCodes.Forbidden);

		// Start our members collection
		let guildMembers = await guild.members.fetch();

		// Get query Params
		const queryParams = request.query;

		// If member role specified, filter by it
		if (!isNullishOrEmpty(queryParams.role)) {
			const paramRoleID: string = queryParams.role as string;
			guildMembers = guildMembers.filter((member) => member.roles.cache.get(paramRoleID));
		}

		// If no members are left after filtering, Error 404
		if (!guildMembers.size) return response.error(HttpCodes.NotFound);

		// Return collection of members
		return response.json({ data: { guildMembers } });
	}

}
