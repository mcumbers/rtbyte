import { FT, T } from "#lib/types";

export const Automatic = T<string>('miscellaneous:automatic');
export const NewsChannel = T<string>('miscellaneous:newsChannel');
export const By = FT<{ user: string}, string>('miscellaneous:by');
export const Category = T<string>('miscellaneous:category');
export const Channel = T<string>('miscellaneous:channel');
export const Directions = T<readonly string[]>('miscellaneous:directions');
export const DisplayID = FT<{ id: string }, string>('miscellaneous:id');
export const Joined = T<string>('miscellaneous:joined');
export const Link = T<string>('miscellaneous:link');
export const Message = T<string>('miscellaneous:message');
export const Registered = T<string>('miscellaneous:registered');
export const ServerCreator = T<string>('miscellaneous:serverCreator');
export const SpeedUnits = T<readonly string[]>('miscellaneous:speedUnits');
export const StageChannel = T<string>('miscellaneous:stageChannel');
export const StoreChannel = T<string>('miscellaneous:storeChannel');
export const Unlimited = T<string>('miscellaneous:unlimited');
export const VoiceChannel = T<string>('miscellaneous:voiceChannel');
