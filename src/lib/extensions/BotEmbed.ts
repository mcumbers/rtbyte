import { Colors, ZeroWidthSpace } from "#utils/constants";
import { EmbedBuilder, type APIEmbedField } from "discord.js";

export class BotEmbed extends EmbedBuilder {
	public constructor() {
		super();
		this.setColor(Colors.White)
		this.setTimestamp()
	}

	public addBlankFields(fields?: APIEmbedField | APIEmbedField[]) {
		if (!fields) return this.addFields({ name: ZeroWidthSpace, value: ZeroWidthSpace });

		if (Array.isArray(fields)) {
			for (const field of fields) {
				this.addBlankFields(field);
			}
		} else {
			const fieldName: string = fields.name.length ? fields.name : ZeroWidthSpace;
			const fieldValue: string = fields.value.length ? fields.value : ZeroWidthSpace;
			const fieldInline: boolean = fields.inline ?? false;
			return this.addFields({ name: fieldName, value: fieldValue, inline: fieldInline });
		}
		return this;
	}
}