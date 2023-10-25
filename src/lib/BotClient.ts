import { CLIENT_OPTIONS } from "#root/config";
import { PrismaClient } from "@prisma/client";
import { SapphireClient } from '@sapphire/framework';

export class BotClient extends SapphireClient {
	public constructor() {
		super(CLIENT_OPTIONS);
	}

	public override async login(token?: string) {
		this.logger.info('Connecting to Discord...');
		return super.login(token);
	}

	public override async destroy() {
		await this.prisma.$disconnect();
		return super.destroy();
	}
}

declare module 'discord.js' {
	export interface Client {
		prisma: PrismaClient;
	}
}
