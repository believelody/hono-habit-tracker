import { RadioInput } from "$components/inputs.component";
import { limitValues } from "$lib/pagination";

export function LimitPaginationRadio({ limit, count }: { limit: number, count: number }) {
  return (
    <div class="flex items-center gap-x-4" id="limit-radio">
      {limitValues.map((option) => (
        <RadioInput
          class="p-3 bg-zinc-700 border cursor-pointer rounded-md shadow-sm hover:bg-slate-900 border-neutral-200/70 peer-checked:bg-white peer-checked:text-slate-900 peer-disabled:cursor-not-allowed peer-disabled:bg-white peer-disabled:text-slate-300"
          name="limit"
          id={`limit-${option}`}
          value={String(option)}
          form="more-habits"
          checked={limit === option}
          text={String(option)}
          disabled={count < option}
        />
      ))}
    </div>
  );
}
