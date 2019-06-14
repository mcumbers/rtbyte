const { KlasaClient } = require('klasa');

module.exports = KlasaClient.defaultGuildSchema
	.add('developmentSettings', folder => folder
		.add('developersAreSuperUsers', 'boolean', { default: false })
		.add('commandAnalytics', 'boolean', { default: true }))
	.add('channels', folder => folder.add('log', 'textchannel'))
	.add('roles', folder => folder
		.add('administrator', 'role')
		.add('moderator', 'role')
		.add('muted', 'role')
		.add('voiceBanned', 'role')
		.add('joinable', 'role', { array: true }))
	.add('logs', folder => folder
		.add('verboseLogging', 'boolean', { default: false })
		.add('events', folder => folder // eslint-disable-line
			.add('channelCreate', 'boolean', { default: false })
			.add('channelDelete', 'boolean', { default: false })
			.add('channelUpdate', 'boolean', { default: false })
			.add('commandRun', 'boolean', { default: false })
			.add('emojiCreate', 'boolean', { default: false })
			.add('emojiDelete', 'boolean', { default: false })
			.add('emojiUpdate', 'boolean', { default: false })
			.add('guildUpdate', 'boolean', { default: false })
			.add('guildMemberAdd', 'boolean', { default: false })
			.add('guildMemberRemove', 'boolean', { default: false })
			.add('guildMemberUpdate', 'boolean', { default: false })
			.add('messageDelete', 'boolean', { default: false })
			.add('messageUpdate', 'boolean', { default: false })
			.add('roleCreate', 'boolean', { default: false })
			.add('roleDelete', 'boolean', { default: false })
			.add('roleUpdate', 'boolean', { default: false }))
		.add('moderation', folder => folder // eslint-disable-line
			.add('ban', 'boolean', { default: true })
			.add('unban', 'boolean', { default: true })
			.add('kick', 'boolean', { default: true })
			.add('mute', 'boolean', { default: true })
			.add('unmute', 'boolean', { default: true })
			.add('purge', 'boolean', { default: true })
			.add('softban', 'boolean', { default: true })
			.add('vcban', 'boolean', { default: true })
			.add('vcunban', 'boolean', { default: true })
			.add('vckick', 'boolean', { default: true })
			.add('antiInvite', 'boolean', { default: true })
			.add('mentionSpam', 'boolean', { default: true })
			.add('blacklistedWord', 'boolean', { default: true })
			.add('blacklistedNickname', 'boolean', { default: true })
			.add('warn', 'boolean', { default: true })))
	.add('greetings', folder => folder
		.add('welcomeNewUsers', 'boolean', { default: false })
		.add('welcomeChannel', 'textchannel')
		.add('welcomeMessage', 'string')
		.add('dismissUsers', 'boolean', { default: false })
		.add('goodbyeChannel', 'textchannel')
		.add('goodbyeMessage', 'string'))
	.add('filters', folder => folder
		.add('wordBlacklistEnabled', 'boolean', { default: false })
		.add('antiInviteEnabled', 'boolean', { default: false })
		.add('mentionSpamEnabled', 'boolean', { default: false })
		.add('warn', 'boolean', { default: false })
		.add('delete', 'boolean', { default: false })
		.add('checkDisplayNames', 'boolean', { default: false })
		.add('modBypass', 'boolean', { default: false })
		.add('words', 'string', { array: true })
		.add('inviteWhitelist', 'string', { array: true })
		.add('mentionSpamThreshold', 'integer', { min: 2, max: 90 }))
	.add('moderation', folder => folder
		.add('notifyUser', 'boolean', { defualt: false }));
