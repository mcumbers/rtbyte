import { BotClient } from '#lib/BotClient';
import '#lib/setup';
import { TOKENS } from '#root/config';

declare module '@sapphire/framework' {
	interface Preconditions {
		IsDeveloper: never;
		IsModerator: never;
		IsAdministrator: never;
		IsGuildOwner: never;
	}
}

const client = new BotClient;

const main = async () => {
	try {
		await client.login(TOKENS.BOT_TOKEN);
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
