import { Collection } from "discord.js";

import { Prisma, PrismaClient } from "@prisma/client";
import type { Args, DynamicModelExtensionThis, InternalArgs } from "@prisma/client/runtime/library";

type PrismaModelNames = Exclude<keyof {
	[P in keyof PrismaClient as P extends `$${string}` ? never : P]: null
}, symbol>

type PrismaModelInterface = DynamicModelExtensionThis<Prisma.TypeMap<InternalArgs & {
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
	public _cache: Collection<string, PrismaModel>;
	private readonly prismaModel: PrismaModelInterface;

	public constructor(prismaModelInterface: PrismaModelInterface) {
		this._cache = new Collection<string, PrismaModel>();
		this.prismaModel = prismaModelInterface;
	}

	public async create(args: Args<PrismaModel, 'create'>) {
		const result = await this.prismaModel.create(args);
		if (!result) return result as null;
		this._cache.set(result.id as string, result as PrismaModel);

		return result as PrismaModel;
	}

	public async findUnique(args: Args<PrismaModel, 'findUnique'>) {
		const result = await this.prismaModel.findUnique(args);
		if (!result) return result as null;
		this._cache.set(result.id as string, result as PrismaModel);

		return result as PrismaModel;
	}

	public async findMany(args: Args<PrismaModel, 'findMany'>) {
		const result = await this.prismaModel.findMany(args);
		if (!result || !result.length) return result as null | PrismaModel[];
		for (const entry of result) {
			this._cache.set(entry.id as string, entry as PrismaModel);
		}
		return result as PrismaModel[];
	}

	public async update(args: Args<PrismaModel, 'update'>) {
		const result = await this.prismaModel.update(args);
		if (!result) return result as null;
		this._cache.set(result.id as string, result as PrismaModel);

		return result as PrismaModel;
	}

	public async delete(args: Args<PrismaModel, 'delete'>) {
		const result = await this.prismaModel.delete(args);
		if (!result) return result as null;
		this._cache.delete(result.id as string);

		return result as PrismaModel;
	}

	public async fetch(id: string, force?: boolean) {
		if (force) return this.findUnique({ where: { id } } as Args<PrismaModel, 'findUnique'>);

		if (this._cache.has(id)) return this._cache.get(id) as PrismaModel;

		return this.findUnique({ where: { id } } as Args<PrismaModel, 'findUnique'>);
	}

	public async fetchMany(ids: string[], force?: boolean) {
		if (!ids.length) return null;
		if (force) return this.findMany({ where: { id: { in: ids } } } as Args<PrismaModel, 'findMany'>);

		const unCached: string[] = ids.filter((entry) => !this._cache.has(entry));

		if (unCached.length) await this.findMany({ where: { id: { in: unCached } } } as Args<PrismaModel, 'findMany'>);

		return Array.from(this._cache.filter((entry, key) => entry && ids.includes(key))) as PrismaModel[];
	}

	public async fetchTuple(idPair: PrismaCacheIDTuple, keys: [string, string], force?: boolean) {
		if (!idPair.length) return null;

		const firstKey = <keyof PrismaModel>keys[0];
		const secondKey = <keyof PrismaModel>keys[1];

		if (force) return this.findUnique({ where: { [`${firstKey as string}_${secondKey as string}`]: { [`${firstKey as string}`]: idPair[0], [`${secondKey as string}`]: idPair[1] } } } as Args<PrismaModel, 'findUnique'>);

		const cached = this._cache.find((entry) => entry[firstKey] === idPair[0] && entry[secondKey] === idPair[1]);
		if (cached) return cached as PrismaModel;

		return this.findUnique({ where: { [`${firstKey as string}_${secondKey as string}`]: { [`${firstKey as string}`]: idPair[0], [`${secondKey as string}`]: idPair[1] } } } as Args<PrismaModel, 'findUnique'>);
	}

	public async fetchTupleMany(idPairs: PrismaCacheIDTuple[], keys: [string, string], force?: boolean) {
		if (!idPairs.length) return null;

		const firstKey = <keyof PrismaModel>keys[0];
		const secondKey = <keyof PrismaModel>keys[1];

		const unCached: any[] = [];

		for (const idPair of idPairs) {
			if (force || !this._cache.find((entry) => entry[firstKey] === idPair[0] && entry[secondKey] === idPair[1])) {
				unCached.push({ [`${firstKey as string}`]: idPair[0], [`${secondKey as string}`]: idPair[1] });
			}
		}

		if (unCached.length) await this.findMany({ where: { [`${firstKey as string}_${secondKey as string}`]: { OR: unCached } } } as Args<PrismaModel, 'findMany'>);

		return Array.from(this._cache.filter((cached) => idPairs.includes([cached[firstKey], cached[secondKey]] as PrismaCacheIDTuple)).values()) as PrismaModel[];

	}
}
