import type { Member } from "./members";
import type { HousePoints } from "./primitives";

export type ContributionData = {
  member: Member;
  totalPoints: HousePoints;
};
