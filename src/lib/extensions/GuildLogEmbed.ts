import { BotEmbed } from "#lib/extensions/BotEmbed";
import { CustomEvents } from "#utils/CustomTypes";
import { Colors } from "#utils/constants";
import { Events } from "@sapphire/framework";

export class GuildLogEmbed extends BotEmbed {
	public setType(type: string) {
		switch (type) {
			case Events.GuildCreate:
			case Events.AutoModerationRuleCreate:
			case Events.ChannelCreate:
			case Events.GuildEmojiCreate:
			case Events.GuildMemberAdd:
			case Events.GuildMembersChunk:
			case Events.GuildRoleCreate:
			case Events.GuildScheduledEventCreate:
			case Events.GuildScheduledEventUserAdd:
			case Events.GuildStickerCreate:
			case Events.InviteCreate:
			case Events.StageInstanceCreate:
			case Events.ThreadCreate:
			case Events.ClientReady:
			case CustomEvents.BotCommandRun:
				this.setColor(Colors.Green);
				break;
			case Events.GuildDelete:
			case Events.AutoModerationRuleDelete:
			case Events.ChannelDelete:
			case Events.GuildBanAdd:
			case Events.GuildEmojiDelete:
			case Events.GuildMemberRemove:
			case Events.GuildRoleDelete:
			case Events.GuildScheduledEventDelete:
			case Events.GuildScheduledEventUserRemove:
			case Events.GuildStickerDelete:
			case Events.InviteDelete:
			case Events.MessageBulkDelete:
			case Events.MessageDelete:
			case Events.MessageReactionRemoveAll:
			case Events.MessageReactionRemoveEmoji:
			case Events.StageInstanceDelete:
			case Events.ThreadDelete:
			case CustomEvents.MessageAttachmentDelete:
			case CustomEvents.ModActionKick:
			case CustomEvents.ModActionPurge:
			case CustomEvents.ModActionMute:
			case CustomEvents.ModActionVCKick:
				this.setColor(Colors.Red);
				break;
			case Events.AutoModerationRuleUpdate:
			case Events.ChannelUpdate:
			case Events.GuildBanRemove:
			case Events.GuildEmojiUpdate:
			case Events.GuildMemberUpdate:
			case Events.GuildRoleUpdate:
			case Events.GuildScheduledEventUpdate:
			case Events.GuildStickerUpdate:
			case Events.GuildUpdate:
			case Events.MessageUpdate:
			case Events.StageInstanceUpdate:
			case Events.ThreadUpdate:
			case CustomEvents.ModActionUnmute:
				this.setColor(Colors.Yellow);
				break;
		}

		return this;
	}
}
