import { initializeMember, initializeUser } from '#utils/functions/initialize';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { BaseInteraction } from 'discord.js';

@ApplyOptions<ListenerOptions>({ event: Events.InteractionCreate })
export class UserEvent extends Listener {
	public async run(interaction: BaseInteraction) {
		if (interaction.guild) {
			// Make sure this Member is initialized in the database
			const dbMember = await this.container.prisma.member.findFirst({ where: { userID: interaction.user.id, guildID: interaction.guild.id } });
			if (!dbMember) await initializeMember(interaction.user, interaction.guild);
		} else {
			// If not in a guild, make sure this User is initialized in the database
			const dbUser = await this.container.prisma.userSettings.findFirst({ where: { id: interaction.user.id } });
			if (!dbUser) await initializeUser(interaction.user);
		}
	}
}
