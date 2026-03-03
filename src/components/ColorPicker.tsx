"use client";

import { Check } from "lucide-react";
import { PRESET_COLORS } from "@/shared/constants/house";

type Props = {
  value: string;
  onChange: (color: string) => void;
  takenColors?: string[];
};

export default function ColorPicker({ value, onChange, takenColors = [] }: Props) {
  return (
    <div className="flex gap-3">
      {PRESET_COLORS.map((color) => {
        const isTaken = takenColors.includes(color);
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            disabled={isTaken}
            onClick={() => onChange(color)}
            className={`relative h-8 w-8 rounded-full transition-transform focus:outline-none ${
              isTaken
                ? "opacity-30 cursor-not-allowed"
                : "hover:scale-110 cursor-pointer"
            } ${isSelected ? "ring-2 ring-offset-2 ring-stone-500 scale-110" : ""}`}
            style={{ backgroundColor: color }}
            aria-label={`カラー${isTaken ? "（使用中）" : ""}`}
            title={isTaken ? "このカラーはすでに使用中です" : ""}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Check size={14} className="text-white" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
