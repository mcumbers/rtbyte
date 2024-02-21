import { PluralKitBotID } from "#utils/constants";
import type { Guild } from "discord.js";

export async function pluralkitInGuild(guild: Guild) {
	return guild.members.fetch(PluralKitBotID).catch(() => undefined);
}
