const XP_MAX_LEVEL = 100;
const XP_MESSAGE_MIN = 10;
const XP_MESSAGE_MAX = 15;

export function getLevel(xp: number) {
	for (let lvl = 0, lvlXP = 0; lvl < XP_MAX_LEVEL; lvl++) {
		const lvlup = (5 * (lvl ** 2) + (50 * lvl) + 100);
		if (xp < (lvlXP += lvlup)) return lvl;
	}
	return XP_MAX_LEVEL;
}

export function messageXPRoll(bonus: number = 0, multiplier: number = 1) {
	return Math.floor((((Math.random() * XP_MESSAGE_MIN) + XP_MESSAGE_MAX) * multiplier) + bonus);
}
