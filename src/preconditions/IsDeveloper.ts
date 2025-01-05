import { ApplyOptions } from '@sapphire/decorators';
import { Precondition, type PreconditionOptions } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

@ApplyOptions<PreconditionOptions>({
	name: 'IsDeveloper'
})

export class DevOnlyPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		return await this.result(message.author.id);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		return await this.result(interaction.user.id);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return await this.result(interaction.user.id);
	}

	private async result(userId: string) {
		const { client, prisma } = this.container;
		try {
			const botGlobalSettings = await prisma.botGlobalSettings.fetch(client.id as string);
			return botGlobalSettings?.botOwners.includes(userId)
				? this.ok()
				: this.error({ message: 'Only the bot developers can use this command!' });
		} catch (error) {
			return this.error({ message: 'Failed to verify Bot Developers from the database' });
		}
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		IsDeveloper: never;
	}
}
