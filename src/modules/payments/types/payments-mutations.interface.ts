export interface ICreatePayment {
  amount: number;
  description?: string;
  meta?: any;
}

export interface ICreateTokensPayment {
  packId: string;
  returnPath?: string;
}
