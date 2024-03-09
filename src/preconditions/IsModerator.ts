import { isModerator } from '#utils/functions/permissions';
import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

export class HasModRolePrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.guild) return this.error({ message: 'This command can only be used in Servers' });
		if (message.member) return this.isModerator(await isModerator(message.member));

		const member = await message.guild.members.fetch(message.author.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.isModerator(await isModerator(member));
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.isModerator(await isModerator(member));
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });
		return this.isModerator(await isModerator(member));
	}

	private async isModerator(isModerator: boolean) {
		return isModerator
			? this.ok()
			: this.error({ message: 'Only Moderators can use this command!' });
	}
}
