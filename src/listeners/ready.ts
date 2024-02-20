import { CONTROL_GUILD, DEV, INIT_ALL_MEMBERS, INIT_ALL_USERS, OWNERS } from '#root/config';
import { initializeGuild, initializeMember, initializeUser } from '#utils/functions/initialize';
import type { BotGlobalSettings } from '@prisma/client';
import { Listener, Store } from '@sapphire/framework';
import { blue, gray, yellow } from 'colorette';

export class UserEvent extends Listener {
	private readonly style = DEV ? yellow : blue;

	public constructor(context: Listener.LoaderContext, options?: Listener.Options) {
		super(context, {
			...options,
			once: true
		});
	}

	public async run() {
		this.printStoreDebugInformation();

		await this.clientValidation();
		await this.guildValidation();
		if (INIT_ALL_USERS) await this.userValidation();
		if (INIT_ALL_MEMBERS) await this.memberValidation();
	}

	private printStoreDebugInformation() {
		const { client, logger } = this.container;
		const stores = [...client.stores.values()];
		const last = stores.pop()!;

		for (const store of stores) logger.info(this.styleStore(store, false));
		logger.info(this.styleStore(last, true));
	}

	private styleStore(store: Store<any>, last: boolean) {
		return gray(`${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`);
	}

	private async clientValidation() {
		const { client, logger, prisma } = this.container;

		logger.info('Starting Client validation...');

		// Update stats if client model exists, create db entry if not
		if (client.id) {
			let globalBotSettings = await prisma.botGlobalSettings.fetch(client.id);
			if (!globalBotSettings) {
				logger.warn('Is this the first run? Creating Global Bot Settings in the Database...');
				const newSettingsObj: BotGlobalSettings = {
					id: client.id,
					userBlocklist: [],
					guildBlocklist: [],
					botOwners: [],
					controlGuildID: '',
					globalLogChannelPublic: '',
					globalLogChannelPrivate: '',
					restarts: []
				};
				if (CONTROL_GUILD) newSettingsObj.controlGuildID = CONTROL_GUILD;
				if (OWNERS) newSettingsObj.botOwners.push(...OWNERS);
				globalBotSettings = await prisma.botGlobalSettings.create({ data: newSettingsObj });
			}

			if (!globalBotSettings || !globalBotSettings.id) {
				logger.error('Failed to create Global Bot Settings in the Database');
				await client.destroy();
				process.exit(1);
			}

			if (!globalBotSettings.controlGuildID) logger.warn('No Control Guild Specified. Some features may be unavailable.');
			if (!globalBotSettings.botOwners.length) logger.warn('No Bot Owners Specified. Some features may be unavailable.');

			const updateData = {
				botOwners: globalBotSettings.botOwners,
				restarts: globalBotSettings.restarts
			};

			updateData.restarts.push(new Date(Date.now()));

			if (OWNERS) {
				for (const owner of OWNERS) {
					if (updateData.botOwners.includes(owner)) continue;
					updateData.botOwners.push(owner);
				}
			}

			await prisma.botGlobalSettings.update({ where: { id: client.id }, data: updateData });
		}

		logger.info('Client validated!');
	}

	private async guildValidation() {
		const { client, logger } = this.container;

		logger.info('Starting guild validation...');

		for (const guildCollection of client.guilds.cache) {
			const guild = guildCollection[1];
			await initializeGuild(guild);
		}

		logger.info('All guilds validated!');
	}

	private async userValidation() {
		const { client, logger } = this.container;

		logger.info('Starting user validation...');

		for (const userCollection of client.users.cache) {
			const user = userCollection[1];
			await initializeUser(user);
		}

		logger.info('All users validated!');
	}

	private async memberValidation() {
		const { client, logger } = this.container;

		logger.info('Starting member validation...');

		for (const guildCollection of client.guilds.cache) {
			const guild = guildCollection[1];

			for (const memberCollection of guild.members.cache) {
				const member = memberCollection[1];
				await initializeMember(member.user, guild);
			}
		}

		logger.info('All members validated!');
	}
}
