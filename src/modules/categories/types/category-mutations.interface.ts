export interface ICategoryCreate {
  name: string;
  description?: string;
}

export interface ICategoryUpdate extends Partial<ICategoryCreate> {}
