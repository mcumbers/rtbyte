import { getLevel } from '#utils/functions/xp';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Check Your XP Rank'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply({ fetchReply: true, ephemeral: true });
		const { prisma } = this.container;

		// See if guild has XP disabled
		if (!interaction.guild) return;
		const guildSettingsXP = await prisma.guildSettingsXP.findFirst({ where: { id: interaction.guild.id } });
		if (!guildSettingsXP || !guildSettingsXP.enabled) return;

		// Create a memberDataXP record for the member if one doesn't exist
		let memberDataXP = await prisma.memberDataXP.findFirst({ where: { userID: interaction.user.id, guildID: interaction.guild.id } });
		if (!memberDataXP) memberDataXP = await prisma.memberDataXP.create({ data: { userID: interaction.user.id, guildID: interaction.guild.id } });

		// Calculate the level info
		const xpLevel = getLevel(memberDataXP.currentXP);

		// Get an array of all memberDataXP entries ordered by XP amount
		let rankedMemberDataXPEntries = await prisma.memberDataXP.findMany({ where: { guildID: interaction.guild.id }, orderBy: { currentXP: 'desc' } });

		// Filter out entries of members who've left the guild
		if (guildSettingsXP.hideOnMemberLeave) {
			const guildMembers = await interaction.guild.members.fetch();
			rankedMemberDataXPEntries = rankedMemberDataXPEntries.filter((entry) => guildMembers.get(entry.userID));
		}

		// Increment rank until we find this member's
		let rank = 0;
		for await (const memberDataXPEntry of rankedMemberDataXPEntries) {
			rank++;
			if (memberDataXPEntry.userID === interaction.user.id) break;
		}

		// Send message
		return interaction.followUp({ content: `Rank: #${rank} | Level ${xpLevel.level} | ${xpLevel.levelXP}/${xpLevel.levelThreshhold}xp`, ephemeral: true });
	}
}
