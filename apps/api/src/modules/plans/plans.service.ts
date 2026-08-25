import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Database } from "../../db/client.js";
import { createPlansRepository, type CreatePlanInput } from "../../db/repositories/plans.repository.js";
import { DATABASE } from "../core/core.module.js";

type UpdatePlanInput = Partial<{
  name: string;
  slug: string;
  priceCents: number;
  limits: Record<string, unknown>;
  isActive: boolean;
}>;

@Injectable()
export class PlansService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  create(input: CreatePlanInput) {
    return createPlansRepository(this.db).create(input);
  }

  list() {
    return createPlansRepository(this.db).list();
  }

  async get(id: string) {
    const plan = await createPlansRepository(this.db).findById(id);

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    return plan;
  }

  async update(id: string, input: UpdatePlanInput) {
    await this.get(id);
    return createPlansRepository(this.db).update(id, input);
  }

  async remove(id: string) {
    await this.get(id);
    const usage = await createPlansRepository(this.db).countUsage(id);

    if (usage > 0) {
      throw new ConflictException(`Plano em uso por ${usage} tenant(s). Desvincule antes de apagar.`);
    }

    await createPlansRepository(this.db).remove(id);
  }
}