import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

export class DevOnlyPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		return this.checkOwner(message.author.id);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		return this.checkOwner(interaction.user.id);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this.checkOwner(interaction.user.id);
	}

	private async checkOwner(userId: string) {
		const { client, prisma } = this.container;
		const botGlobalSettings = await prisma.botGlobalSettings.findFirst({ where: { id: client.id as string } });
		return botGlobalSettings?.botOwners.includes(userId)
			? this.ok()
			: this.error({ message: 'Only the bot developers can use this command!' });
	}
}
