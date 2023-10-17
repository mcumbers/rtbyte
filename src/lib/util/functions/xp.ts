const XP_MAX_LEVEL = 100;
const XP_MESSAGE_MIN = 10;
const XP_MESSAGE_MAX = 15;

export interface XPLevel {
	level: number,
	levelThreshhold: bigint,
	levelXP: bigint,
	totalXP: bigint
}

export function getLevel(totalXP: number | bigint) {
	for (let level = 0, reqXP = 0n; level < XP_MAX_LEVEL; level++) {
		const levelThreshhold = BigInt(5 * (level ** 2) + (50 * level) + 100);
		if (totalXP < (reqXP += levelThreshhold)) return {
			level,
			levelThreshhold,
			levelXP: BigInt(totalXP) - (reqXP - levelThreshhold),
			totalXP
		} as XPLevel;
	}
	return {
		level: XP_MAX_LEVEL,
		levelThreshhold: 0n,
		levelXP: 0n,
		totalXP
	} as XPLevel;
}

export function messageXPRoll(bonus: number = 0, multiplier: number = 1) {
	return BigInt(Math.floor((((Math.random() * XP_MESSAGE_MIN) + XP_MESSAGE_MAX) * multiplier) + bonus));
}
