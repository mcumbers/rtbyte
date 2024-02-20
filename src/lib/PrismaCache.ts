import { Collection } from "discord.js";

import { Prisma, PrismaClient } from "@prisma/client";
import type { Args, DynamicModelExtensionThis, InternalArgs } from "@prisma/client/runtime/library";

type PrismaModelNames = Exclude<keyof {
	[P in keyof PrismaClient as P extends `$${string}` ? never : P]: null
}, symbol>

type PrismaAccessor = DynamicModelExtensionThis<Prisma.TypeMap<InternalArgs & {
	result: object;
	model: object;
	query: object;
	client: object;
}>, Capitalize<PrismaModelNames>, {
	result: object;
	model: object;
	query: object;
	client: object;
}>

export type PrismaCacheIDTuple = [number | string, number | string];

export class PrismaCache<PrismaModel> {
	private cache: Collection<string, PrismaModel>;
	private readonly prismaModel: PrismaAccessor;

	public constructor(prismaAccessor: PrismaAccessor) {
		this.cache = new Collection<string, PrismaModel>();
		this.prismaModel = prismaAccessor;
	}

	public async create(args: Args<PrismaModel, 'create'>) {
		const result = await this.prismaModel.create(args);
		if (!result) return result;
		this.cache.set(result.id as string, result as PrismaModel);

		return result;
	}

	public async findUnique(args: Args<PrismaModel, 'findUnique'>) {
		const result = await this.prismaModel.findUnique(args);
		if (!result) return result;
		this.cache.set(result.id as string, result as PrismaModel);

		return result;
	}

	public async findMany(args: Args<PrismaModel, 'findMany'>) {
		const result = await this.prismaModel.findMany(args);
		if (!result || result.length) return result;
		for (const entry of result) {
			this.cache.set(entry.id as string, entry as PrismaModel);
		}
		return result;
	}

	public async update(args: Args<PrismaModel, 'update'>) {
		const result = await this.prismaModel.update(args);
		if (!result) return result;
		this.cache.set(result.id as string, result as PrismaModel);

		return result;
	}

	public async delete(args: Args<PrismaModel, 'delete'>) {
		const result = await this.prismaModel.delete(args);
		if (!result) return result;
		this.cache.delete(result.id as string);

		return result;
	}

	public async fetch(id: string | string[], force?: boolean) {
		if (!id || !id.length) return undefined;
		if (force) return this.findMany({ where: { id: Array.isArray(id) ? { in: id } : id } } as Args<PrismaModel, 'findMany'>);

		if (Array.isArray(id)) {
			const unCached: string[] = id.filter((entry) => !this.cache.has(entry));
			if (unCached.length) await this.findMany({ where: { id: { in: unCached } } } as Args<PrismaModel, 'findMany'>);
			return Array.from(this.cache.filter((entry, key) => entry && id.includes(key)));
		}

		if (this.cache.has(id)) return this.cache.get(id);

		return this.findUnique({ where: { id } } as Args<PrismaModel, 'findUnique'>);
	}

	public async fetchTuple(ids: PrismaCacheIDTuple | PrismaCacheIDTuple[], keys: PrismaCacheIDTuple, force?: boolean) {
		if (!ids.length) return undefined;

		const firstKey = <keyof PrismaModel>keys[0];
		const secondKey = <keyof PrismaModel>keys[1];

		if (Array.isArray(ids[0])) {
			const idsArr = <Array<PrismaCacheIDTuple>>ids;
			const unCached: any[] = [];

			for (const pair of idsArr) {
				if (force || !this.cache.find((cached) => {
					const asserted = <PrismaModel>cached;
					return asserted[firstKey] === pair[0] && asserted[secondKey] === pair[1];
				})) unCached.push({ [`${firstKey as string}`]: pair[0], [`${secondKey as string}`]: pair[1] });
			}

			if (unCached.length) await this.findMany({ where: { OR: unCached } } as Args<PrismaModel, 'findMany'>);
		}

		const cached = this.cache.find((cached) => {
			const asserted = <PrismaModel>cached;
			return asserted[firstKey] === ids[0] && asserted[secondKey] === ids[1];
		});

		if (!force && cached) return cached;

		return this.findUnique({ where: { [`${firstKey as string}`]: ids[0], [`${secondKey as string}`]: ids[1] } } as Args<PrismaModel, 'findUnique'>);
	}
}
