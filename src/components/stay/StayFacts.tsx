import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

export type Fact = { label: string; value: string };

export function StayFacts({ facts, amenities }: { facts: Fact[]; amenities: string[] }) {
  const { common } = useContent();
  return (
    <Reveal>
      <dl className="grid gap-8 rounded-md bg-linen p-8 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="label-caps text-stone/80">{fact.label}</dt>
            <dd className="mt-2 font-display text-xl font-medium text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {amenities.length ? (
        <div className="mt-10">
          <h2 className="label-caps text-sage">{common.labels.amenities}</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-stone sm:grid-cols-2">
            {amenities.map((amenity) => (
              <li key={amenity} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" aria-hidden />
                {amenity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Reveal>
  );
}