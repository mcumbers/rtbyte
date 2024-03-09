import type { CommandRunEvent } from '#root/listeners/control-guild-logs/commandRun';
import { CustomEvents } from '#utils/CustomTypes';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { GuildChannel } from 'discord.js';

enum XPCommandActions {
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLIER = 'multiplier'
}

export interface XPMultiplerStore {
	multipliers: XPMultiplier[]
}

export interface XPMultiplier {
	id: string,
	multiplier: number
}

@ApplyOptions<Command.Options>({
	description: 'Add or Subtract XP from a User, or set their multiplier',
	preconditions: ['IsModerator']
})

export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) =>
					option
						.setName('action')
						.setDescription('What you\'re doing')
						.setRequired(true)
						.setChoices(
							{ name: 'Add', value: XPCommandActions.ADD },
							{ name: 'Subtract', value: XPCommandActions.SUBTRACT },
							{ name: 'Set Multiplier', value: XPCommandActions.MULTIPLIER }
						)
				)
				.addNumberOption((option) =>
					option
						.setName('amount')
						.setDescription('Amount of XP to Add or Subtract--Or the new XP Multiplier')
						.setRequired(true)
						.setMinValue(0)
						.setMaxValue(999999999)
				)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('User whose XP or Multiplier you\'re modifying')
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Channel whose Multiplier you\'re modifying')
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('Role whose Multiplier you\'re modifying')
				)
				.addBooleanOption((option) =>
					option
						.setName('private')
						.setDescription('Whether or not the message should be shown only to you (default false)')
				)
		}
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		try {

			if (!interaction.guild) return;
			const startTime = Date.now();
			// Check to see if response should be ephemeral
			const ephemeral = interaction.options.getBoolean('private') ?? false;
			let message = await interaction.deferReply({ ephemeral, fetchReply: true });

			// Grab Guild's XP Settings
			let guildSettingsXP = await this.container.prisma.guildSettingsXP.fetch(interaction.guild.id);
			// Create GuildSettingsXP if it doesn't exist yet
			if (!guildSettingsXP) {
				guildSettingsXP = await this.container.prisma.guildSettingsXP.create({
					data: {
						id: interaction.guild.id
					}
				});
			}
			// End Interaction if we couldn't create GuildSettingsXP
			if (!guildSettingsXP) {
				message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
			}
			// End Interaction if Levels & XP are disabled for the Guild
			if (!guildSettingsXP.enabled) {
				message = await interaction.followUp({ content: 'Levels & XP are not enabled on this Server' });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
			}

			// Start variables prep
			const action = interaction.options.getString('action') as XPCommandActions;
			const amount = interaction.options.getNumber('amount') as number;

			const targetChannel = interaction.options.getChannel('channel') as GuildChannel | null;
			const targetUser = interaction.options.getUser('user');
			const targetRole = interaction.options.getRole('role');

			const completedStringUser = `${action === XPCommandActions.ADD ? `Added ${amount}xp to ${targetUser?.toString()}` : ''}${action === XPCommandActions.SUBTRACT ? `Removed ${amount}xp from ${targetUser?.toString()}` : ''}${action === XPCommandActions.MULTIPLIER ? `Set XP Multiplier to ${amount}x for ${targetUser?.toString()}` : ''}`;
			const completedStringChannel = `${action === XPCommandActions.MULTIPLIER ? `Set XP Multiplier to ${amount}x for ${targetChannel?.toString()}` : ''}`;
			const completedStringRole = `${action === XPCommandActions.MULTIPLIER ? `Set XP Multiplier to ${amount}x for ${targetRole?.toString()}` : ''}`;

			if (targetChannel) {
				if (action !== XPCommandActions.MULTIPLIER) {
					message = await interaction.followUp({ content: 'You cannot add or subtract XP from a Channel' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
				}

				if (!targetChannel.isTextBased()) {
					message = await interaction.followUp({ content: 'Users can only earn XP in Text-Based Channels' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
				}

				// Create the new Multiplier Object
				const newMultiplier: XPMultiplier = {
					id: targetChannel.id,
					multiplier: amount
				};

				let existing = guildSettingsXP.channelMultipliers as any as XPMultiplerStore;

				if (!existing || !existing.multipliers) {
					existing = { multipliers: [] };
				}

				const existingIndex = existing.multipliers.findIndex((entry) => entry.id === newMultiplier.id);

				if (existingIndex === -1) {
					existing.multipliers.push(newMultiplier);
				} else {
					existing.multipliers[existingIndex] = newMultiplier;
				}

				const updated = await this.container.prisma.guildSettingsXP.update({
					where: { id: guildSettingsXP.id },
					data: {
						channelMultipliers: existing as any
					}
				});

				// Update failed... Exit interaction
				if (!updated) {
					message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
				}

				message = await interaction.followUp({ content: completedStringChannel });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
			}

			if (targetRole) {
				if (action !== XPCommandActions.MULTIPLIER) {
					message = await interaction.followUp({ content: 'You cannot add or subtract XP from a Role' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
				}

				// Create the new Multiplier Object
				const newMultiplier: XPMultiplier = {
					id: targetRole.id,
					multiplier: amount
				};

				let existing = guildSettingsXP.roleMultipliers as any as XPMultiplerStore;

				if (!existing || !existing.multipliers) {
					existing = { multipliers: [] };
				}

				const existingIndex = existing.multipliers.findIndex((entry) => entry.id === newMultiplier.id);

				if (existingIndex === -1) {
					existing.multipliers.push(newMultiplier);
				} else {
					existing.multipliers[existingIndex] = newMultiplier;
				}

				const updated = await this.container.prisma.guildSettingsXP.update({
					where: { id: guildSettingsXP.id },
					data: {
						roleMultipliers: existing as any
					}
				});

				// Update failed... Exit interaction
				if (!updated) {
					message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
				}

				message = await interaction.followUp({ content: completedStringRole });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
			}

			if (targetUser) {
				const member = await interaction.guild.members.fetch(targetUser.id).catch(() => undefined);

				if (!member) {
					message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
				}

				let memberDataXP = await this.container.prisma.memberDataXP.fetchTuple([member.id, interaction.guild.id], ['userID', 'guildID']);

				if (!memberDataXP) {
					// Create MemberDataXP entry for this user
					memberDataXP = await this.container.prisma.memberDataXP.create({
						data: {
							userID: interaction.user.id,
							guildID: interaction.guild.id,
							currentXP: BigInt(action === XPCommandActions.ADD ? amount : (amount * -1))
						}
					});

					// See if creation failed
					if (!memberDataXP) {
						message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
						return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
					}

					message = await interaction.followUp({ content: completedStringUser });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
				}

				if (action !== XPCommandActions.MULTIPLIER) {
					memberDataXP.currentXP += BigInt(action === XPCommandActions.ADD ? amount : (amount * -1));

					const updated = await this.container.prisma.memberDataXP.update({ where: { id: memberDataXP.id }, data: memberDataXP });
					if (!updated) {
						message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
						return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
					}

					message = await interaction.followUp({ content: completedStringUser });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
				}

				memberDataXP.multiplier = amount;

				const updated = await this.container.prisma.memberDataXP.update({ where: { id: memberDataXP.id }, data: memberDataXP });
				if (!updated) {
					message = await interaction.followUp({ content: 'Whoops! Something went wrong...' });
					return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime, failed: true } as CommandRunEvent);
				}

				message = await interaction.followUp({ content: completedStringUser });
				return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
			}

			message = await interaction.followUp({ content: 'You must specify a target User, Channel, or Role' });
			return this.container.client.emit(CustomEvents.BotCommandRun, { interaction, message, runtime: Date.now() - startTime } as CommandRunEvent);
		} catch (error) {
			console.log(error);
			return null;
		}
	}
}
