'use client';

import { cn } from '@/lib/utils';

export function Toggle({
  pressed,
  onPressedChange,
  label,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        onClick={() => onPressedChange(!pressed)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primarycolor focus:ring-offset-2 focus:ring-offset-custombgcolor',
          pressed ? 'bg-primarycolor' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
            pressed ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <span className="text-sm text-zinc-400 select-none">{label}</span>
      )}
    </label>
  );
}
