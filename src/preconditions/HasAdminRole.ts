import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, GuildMemberResolvable, GuildResolvable, Message } from 'discord.js';

export class HasAdminRolePrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.member || !message.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasAdminRole(message.member.id, message.guildId);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasAdminRole(interaction.user.id, interaction.guildId);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasAdminRole(interaction.user.id, interaction.guildId);
	}

	private async hasAdminRole(memberID: GuildMemberResolvable, guildID: GuildResolvable) {
		const { prisma, client } = this.container;
		const guild = await client.guilds.fetch(guildID as string);
		const guildMember = await guild.members.fetch(memberID);
		const guildSettings = await prisma.guildSettings.fetch(guild.id);

		let hasAdminRole = false;
		if (guildSettings?.adminRoles) {
			for await (const adminRoleID of guildSettings?.adminRoles) {
				if (guildMember.roles.cache.has(adminRoleID)) hasAdminRole = true;
			}
		}

		return hasAdminRole
			? this.ok()
			: this.error({ message: 'Only members with the admin role can use this command!' });
	}
}
