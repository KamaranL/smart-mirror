/* Interfaces | Types | Enums */

export enum EntityType {
  project,
  repository
}

export type Entity = {
  type: EntityType;
  name: string;
};

export type Environment = {
  token: string;
  file?: string;
};

export type Defaults = {
  owner: string;
  project: string;
  repository: string;
  // workspace?: string; @tba
  // groupNameId?: string; @tba
  createMirror: boolean;
  visibility?: string;
};

export interface Configuration extends Environment, Defaults {
  mode: string;
}

export enum Operation {
  create,
  read
}

export type RequestObject<T> = {
  operation: Operation;
  entity: Entity;
  asyncFunction: () => Promise<T>;
  maxAttempts?: number;
};
