import { BotClient } from '#lib/BotClient';
import '#lib/setup';
import { TOKENS } from '#root/config';

const client = new BotClient;

const main = async () => {
	try {
		await client.login(TOKENS.BOT_TOKEN);
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};

void main();
