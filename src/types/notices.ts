import type { IsoDateTimeString } from "./primitives";

export type Notice = {
  id: string;
  houseId: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: IsoDateTimeString;
  isImportant: boolean;
  deletedAt?: IsoDateTimeString;
  deletedBy?: string;
};

export type CreateNoticeInput = {
  houseId: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: IsoDateTimeString;
  isImportant: boolean;
};
