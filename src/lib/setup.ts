// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import '#utils/Sanitizer/initClean';
import { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-logger/register';
import { createColors } from 'colorette';
import { Collection, type Snowflake } from 'discord.js';
import { fieldEncryptionExtension } from 'prisma-field-encryption';
import { inspect } from 'util';

interface RoleUpdate {
	lastUpdated?: number
}
const roleUpdates = new Collection<Snowflake, RoleUpdate>();

const prisma = new PrismaClient().$extends(
	fieldEncryptionExtension()
);

inspect.defaultOptions.depth = 1;
createColors({ useColor: true });
container.prisma = prisma;
container.roleUpdates = roleUpdates;

declare module '@sapphire/pieces' {
	interface Container {
		prisma: typeof prisma;
		roleUpdates: typeof roleUpdates;
	}
}
