import { authenticated } from '#root/lib/util/decorators/routeAuthenticated';
import type { BotGlobalSettings } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { HttpCodes, Route, methods, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';

@ApplyOptions<Route.Options>({
	name: 'botGlobalSettings',
	route: 'bot/:id/settings'
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

		// Bad request if requesting settings for a client that is not this bot
		if (request.params.id !== client.id) response.error(HttpCodes.BadRequest);

		// Get botGlobalSettings... Not Found if no botGlobalSettings returned from database
		const botGlobalSettings = await prisma.botGlobalSettings.fetch(request.params.id);
		if (!botGlobalSettings) response.error(HttpCodes.NotFound);

		// Forbidden if requester is not a botOwner
		if (!botGlobalSettings?.botOwners.includes(requestAuth.id)) response.error(HttpCodes.Forbidden);

		return response.json({ data: { botGlobalSettings } });
	}

	@authenticated()
	public async [methods.POST](request: ApiRequest, response: ApiResponse) {
		const requestAuth = request.auth!
		const { client, prisma } = this.container;

		// Bad request if requesting settings for a client that is not this bot
		if (request.params.id !== client.id) response.error(HttpCodes.BadRequest);

		// Get botGlobalSettings... Not Found if no botGlobalSettings returned from database
		const botGlobalSettings = await prisma.botGlobalSettings.fetch(request.params.id);
		if (!botGlobalSettings) response.error(HttpCodes.NotFound);

		// Forbidden if requester is not a botOwner
		if (!botGlobalSettings?.botOwners.includes(requestAuth.id)) response.error(HttpCodes.Forbidden);

		// Get the settings submitted to us from the client
		const body = request.body as any;
		const submittedSettings: any = body.data.botGlobalSettings as object;

		// Iterate through local settings, building a list of updated fields
		const updateSettings: any = {};
		for (const key in botGlobalSettings) {
			if (submittedSettings[key] !== botGlobalSettings[key as keyof BotGlobalSettings]) updateSettings[key] = submittedSettings[key];
		}

		// Update local settings in database
		const updatedSettings = await prisma.botGlobalSettings.update({ where: { id: client.id }, data: updateSettings });

		// Send newly-updated settings back to client
		response.json({ data: { botGlobalSettings: updatedSettings } });
	}
}
