import { Colors, ZeroWidthSpace } from "#utils/constants";
import { UpdateLogStyle } from "@prisma/client";
import { isNullishOrEmpty } from "@sapphire/utilities";
import * as Diff from 'diff';
import { EmbedBuilder } from "discord.js";

export interface BlankableAPIEmbedField {
	name?: string;
	value?: string;
	inline?: boolean;
}

export class BotEmbed extends EmbedBuilder {
	public constructor() {
		super();
		this.setColor(Colors.White)
		this.setTimestamp()
	}

	public addBlankFields(fields?: BlankableAPIEmbedField | BlankableAPIEmbedField[]) {
		if (!fields) return this.addFields({ name: ZeroWidthSpace, value: ZeroWidthSpace });

		if (Array.isArray(fields)) {
			for (const field of fields) {
				this.addBlankFields(field);
			}
		} else {
			return this.addFields({ name: isNullishOrEmpty(fields.name) ? ZeroWidthSpace : fields.name, value: isNullishOrEmpty(fields.value) ? ZeroWidthSpace : fields.value, inline: fields.inline || false });
		}
		return this;
	}

	public addDiffFields(oldString?: string, newString?: string, descriptor?: string, style: UpdateLogStyle = UpdateLogStyle.before_after) {
		if (oldString === newString) return this;

		let inline = false;

		if (!oldString) {
			inline = !(newString && newString.length > 24);
			this.addBlankFields({ name: `${descriptor} Added`, value: newString as string, inline });
		}

		if (!newString) {
			inline = !(oldString && oldString.length > 24);
			this.addBlankFields({ name: `${descriptor} Removed`, value: oldString as string, inline });
		}

		if (newString && oldString) {
			inline = !(oldString.length > 24 || newString.length > 24);

			if (style === UpdateLogStyle.after_only) {
				this.addBlankFields({ name: `New ${descriptor}`, value: newString, inline });
			}

			if (style === UpdateLogStyle.before_after) {
				this.addBlankFields({ name: `Old ${descriptor}`, value: oldString, inline });
				this.addBlankFields({ name: `New ${descriptor}`, value: newString, inline });
			}

			if (style === UpdateLogStyle.before_only) {
				this.addBlankFields({ name: `Old ${descriptor}`, value: oldString, inline });
			}

			if (style === UpdateLogStyle.diff) {
				const diff = Diff.diffChars(oldString as string, newString as string);

				let workingString = ``;

				for (const part of diff) {
					workingString += `${part.added ? `+` : part.removed ? `-` : `~`} ${part.value}\n`;
				}

				this.addBlankFields({ name: `${descriptor} Changes`, value: `\`\`\`diff\n${workingString.replaceAll('```', `\`${ZeroWidthSpace}\`\``)}\`\`\``, inline: false });
				this.addBlankFields({ name: `New ${descriptor}`, value: newString || ``, inline: false });
			}
		}

		if (inline) this.addBlankFields({ name: '', value: '', inline: true });

		return this;
	}
}
