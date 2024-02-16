import { PluralKitBotID } from "#utils/constants";
import type { Guild } from "discord.js";

export async function pluralkitInGuild(guild: Guild) {
	const member = await guild.members.fetch(PluralKitBotID);
	if (!member) return false;
	return true;
}
