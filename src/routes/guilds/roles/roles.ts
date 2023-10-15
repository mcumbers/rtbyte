import { authenticated } from '#root/lib/util/decorators/routeAuthenticated';
import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, Route, methods, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { PermissionsBitField } from 'discord.js';

@ApplyOptions<Route.Options>({
	name: 'roles',
	route: 'guilds/:guildID/roles'
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

		// Start our roles collection
		let roles = await guild.roles.fetch();

		// Get query Params
		const queryParams = request.query;

		// If role name specified, filter by it
		if (!isNullishOrEmpty(queryParams.name)) {
			const paramName: string = queryParams.name as string;
			roles = roles.filter((role) => role.name === paramName);
		}

		// If no roles are left after filtering, Error 404
		if (!roles.size) return response.error(HttpCodes.NotFound);

		// Return collection of roles
		return response.json({ data: { roles } });
	}

}
