const { Event } = require('klasa');
const { MessageEmbed } = require('discord.js');

module.exports = class extends Event {

	constructor(...args) {
		super(...args, { event: 'roleCreate' });
	}

	async run(role) {
		if (role.guild.available && role.guild.settings.get('channels.log') && role.guild.settings.get('logs.events.roleCreate')) await this.newRoleLog(role);

		return;
	}

	async newRoleLog(role) {
		const embed = new MessageEmbed()
			.setAuthor(`${role.name}`, role.guild.iconURL())
			.setColor(this.client.settings.get('colors.green'))
			.setTimestamp()
			.setFooter(role.guild.language.get('GUILD_LOG_ROLECREATE'));

		if (role.guild.settings.get('logs.verboseLogging')) {
			embed.addField(role.guild.language.get('ID'), role.id);
			embed.addField(role.guild.language.get('GUILD_LOG_ROLECREATE_V_TAG'), role);
		}

		const logChannel = await this.client.channels.get(role.guild.settings.get('channels.log'));
		await logChannel.send('', { disableEveryone: true, embed: embed });
		return;
	}

};
