import type { SavedCoachResult } from "@/lib/types";
import type { Maps } from "./shared";
import { ItemDetails } from "./item-details";
import { LoadoutDetails } from "./loadout-details";

export function BuildDetails({ result, maps }: { result: SavedCoachResult; maps: Maps }) {
  return (
    <div className="space-y-8">
      <ItemDetails build={result.plan.build} maps={maps} />
      <div className="border-t border-divider pt-8">
        <LoadoutDetails build={result.plan.build} maps={maps} />
      </div>
    </div>
  );
}
