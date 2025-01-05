import { isAdmin } from '#utils/functions/permissions';
import { ApplyOptions } from '@sapphire/decorators';
import { Precondition, type PreconditionOptions } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

@ApplyOptions<PreconditionOptions>({
	name: 'IsAdministrator'
})

export class HasAdminRolePrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.guild) return this.error({ message: 'This command can only be used in Servers' });
		if (message.member) return this.result(await isAdmin(message.member));

		const member = await message.guild.members.fetch(message.author.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });

		try {
			const allowed = await isAdmin(member);
			return this.result(allowed);
		} catch (error) {
			this.container.logger.error(error);
			return this.error({ message: 'Failed to verify Admin Roles from the database' });
		}
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });

		try {
			const allowed = await isAdmin(member);
			return this.result(allowed);
		} catch (error) {
			this.container.logger.error(error);
			return this.error({ message: 'Failed to verify Admin Roles from the database' });
		}
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guild) return this.error({ message: 'This command can only be used in Servers' });

		const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => undefined);
		if (!member) return this.error({ message: 'Failed to fetch permissions for User' });

		try {
			const allowed = await isAdmin(member);
			return this.result(allowed);
		} catch (error) {
			this.container.logger.error(error);
			return this.error({ message: 'Failed to verify Admin Roles from the database' });
		}
	}

	private result(isAdmin: boolean = false) {
		if (isAdmin) return this.ok();
		return this.error({ message: 'Only Administrators can use this command!' });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		IsAdministrator: never;
	}
}
