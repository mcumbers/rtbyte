import { isGuildOwner } from '#utils/functions/permissions';
import { ApplyOptions } from '@sapphire/decorators';
import { Precondition, type PreconditionOptions } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

@ApplyOptions<PreconditionOptions>({
	name: 'IsGuildOwner'
})

export class IsGuildOwnerPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.guild) return this.error({ message: 'This command can only be used in Servers' });
		if (message.member) return this.result(isGuildOwner(message.member));

		const member = await message.guild.members.fetch(message.author.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.result(isGuildOwner(member));
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.result(isGuildOwner(member));
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.result(isGuildOwner(member));
	}

	private result(isGuildOwner: boolean = false) {
		if (isGuildOwner) return this.ok();
		return this.error({ message: 'Only Server Owners can use this command!' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		IsGuildOwner: never;
	}
}
