import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, GuildMemberResolvable, GuildResolvable, Message } from 'discord.js';

export class HasModRolePrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.member || !message.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasModRole(message.member.id, message.guildId);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasModRole(interaction.user.id, interaction.guildId);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.hasModRole(interaction.user.id, interaction.guildId);
	}

	private async hasModRole(memberID: GuildMemberResolvable, guildID: GuildResolvable) {
		const { prisma, client } = this.container;
		const guild = await client.guilds.fetch(guildID as string);
		const guildMember = await guild.members.fetch(memberID);
		const guildSettings = await prisma.guildSettings.findFirst({ where: { id: guild.id as string } });

		let hasModRole = false;
		if (guildSettings?.moderatorRoles) {
			for await (const modRoleID of guildSettings?.moderatorRoles) {
				if (guildMember.roles.cache.has(modRoleID)) hasModRole = true;
			}
		}

		return hasModRole
			? this.ok()
			: this.error({ message: 'Only members with the moderator role can use this command!' });
	}
}
