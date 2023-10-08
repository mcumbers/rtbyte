import { CONTROL_GUILD, DEV, INIT_ALL_MEMBERS, INIT_ALL_USERS } from '#root/config';
import { initializeGuild, initializeMember, initializeUser } from '#utils/functions/initialize';
import type { ListenerOptions, PieceContext } from '@sapphire/framework';
import { Listener, Store } from '@sapphire/framework';
import { blue, gray, yellow } from 'colorette';

export class UserEvent extends Listener {
	private readonly style = DEV ? yellow : blue;

	public constructor(context: PieceContext, options?: ListenerOptions) {
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
			const clientData = await prisma.clientSettings.findFirst();
			if (!clientData) await prisma.clientSettings.create({ data: { id: client.id } });

			const restarts = clientData?.restarts;
			restarts?.push(new Date(Date.now()));
			await prisma.clientSettings.update({ where: { id: client.id }, data: { restarts } })
		}

		logger.info('Client validated!');
	}

	private async guildValidation() {
		const { client, logger } = this.container;

		if (!CONTROL_GUILD) {
			logger.fatal('A control guild has not been set - shutting down...');
			return client.destroy();
		}
		if (!client.guilds.cache.has(CONTROL_GUILD)) {
			logger.fatal('Bot has not been added to the configured control guild - shutting down...');
			return client.destroy();
		}

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
