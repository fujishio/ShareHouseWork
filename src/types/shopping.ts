import type { ExpenseCategory } from "./expenses";
import type { IsoDateString } from "./primitives";

export type ShoppingItem = {
  id: string;
  houseId: string;
  name: string;
  quantity: string;
  memo: string;
  category?: ExpenseCategory;
  addedBy: string;
  addedAt: IsoDateString;
  checkedBy?: string;
  checkedAt?: IsoDateString;
  canceledAt?: IsoDateString;
  canceledBy?: string;
};

export type CreateShoppingItemInput = {
  houseId: string;
  name: string;
  quantity: string;
  memo: string;
  category?: ExpenseCategory;
  addedBy: string;
  addedAt: IsoDateString;
};

export type CheckShoppingItemInput = {
  checkedBy: string;
};
