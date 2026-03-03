import { InputHTMLAttributes } from "react";

type FormInputProps = {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const INPUT_CLASS =
  "w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors";

export { INPUT_CLASS };

export default function FormInput({ label, hint, className, ...props }: FormInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1.5">{label}</label>
      <input className={className ?? INPUT_CLASS} {...props} />
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}
