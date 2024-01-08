import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, GuildMemberResolvable, GuildResolvable, Message } from 'discord.js';

export class IsGuildOwnerPrecondition extends Precondition {
	public override async messageRun(message: Message) {
		if (!message.member || !message.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.isGuildOwner(message.member.id, message.guildId);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.isGuildOwner(interaction.user.id, interaction.guildId);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (!interaction.guildId) return this.error({ message: 'This command can only be used in Servers' });
		return this.isGuildOwner(interaction.user.id, interaction.guildId);
	}

	private async isGuildOwner(memberID: GuildMemberResolvable, guildID: GuildResolvable) {
		const { client } = this.container;
		const guild = await client.guilds.fetch(guildID as string);
		const guildMember = await guild.members.fetch(memberID);

		return guild.ownerId === guildMember.id
			? this.ok()
			: this.error({ message: 'Only the Server Owner can use this command!' });
	}
}
