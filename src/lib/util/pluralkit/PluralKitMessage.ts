import { fetch } from "@sapphire/fetch";
import type { Snowflake } from "discord.js";
import { setTimeout } from 'timers/promises';

const RETRIES_MAX = 5;

export class PluralKitMessage {
	public id: Snowflake | undefined;
	public originalID: Snowflake | undefined;
	public authorID: Snowflake | undefined;
	public channelID: Snowflake | undefined;
	public guildID: Snowflake | undefined;
	public timestamp: Date | undefined;

	public async fetchMessage(messageID: Snowflake, retries: number = 0): Promise<PluralKitMessage | null> {
		try {
			const response: any = await fetch(`https://api.pluralkit.me/v2/messages/${messageID}`);
			if (response.timestamp) this.timestamp = new Date(response.timestamp);
			if (response.id) this.id = response.id;
			if (response.original) this.originalID = response.original;
			if (response.sender) this.authorID = response.sender;
			if (response.channel) this.channelID = response.channel;
			if (response.guild) this.guildID = response.guild;
			return this;
		} catch (error: any) {
			// Rate Limited... Wait 1 second and try again.
			if (error.code === 429 && retries < RETRIES_MAX) {
				await setTimeout(1000, await this.fetchMessage(messageID, retries + 1));
			}
			// Message wasn't from PluralKit (or was more than 30 mins old)
			if (error.code === 404) {
				return null;
			}
			return null;
		};
	}
};
