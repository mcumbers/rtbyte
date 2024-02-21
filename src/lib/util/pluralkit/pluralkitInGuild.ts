import { PluralKitBotID } from "#utils/constants";
import type { Guild } from "discord.js";

export async function pluralkitInGuild(guild: Guild) {
	try {
		const member = await guild.members.fetch(PluralKitBotID);
		if (member) return true;
	} catch (err) {
		return false;
	}
	return false;
}
