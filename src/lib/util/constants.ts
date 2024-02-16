import type { Snowflake } from "discord.js";

export const ZeroWidthSpace = '\u200B';

export const enum Colors {
	Green = '#2DC770',
	Red = '#F23A38',
	White = '#FEFEFE',
	Yellow = '#F0A431'
}

export const enum Emojis {
	Bullet = '<:bulletPoint:1127188144803041320>',
	Check = '<:checkMark:1127182446971072643>',
	ToggleOff = '<:toggleOff:1127185093379751976>',
	ToggleOn = '<:toggleOn:1127182742514311229>',
	Warning = '<:rtbyte_warning:898950475628552223>',
	X = '<:xMark:1127184643460960286>'
}

export const PluralKitBotID: Snowflake = '466378653216014359';

export const PluralKitCommands: Array<string> = ['pk;system', 'pk;find', 'pk;member', 'pk;group', 'pk;switch', 'pk;autoproxy', 'pk;config', 'pk;log', 'pk;blacklist', 'pk;message', 'pk;invite', 'pk;import', 'pk;export', 'pk;debug', 'pk;edit', 'pk;reproxy', 'pk;link', 'pk;unlink', 'pk;random', 'pk;token', 'pk;s', 'pk;help', 'pk;commands'];
