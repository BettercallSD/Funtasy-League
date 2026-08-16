function Field({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-bk-text-secondary text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        defaultValue={defaultValue}
        required
        min={0}
        className="border-bk-border bg-bk-bg mt-1 w-full rounded-md border px-3 py-2 text-sm"
      />
      {hint && <p className="text-bk-text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

// Shared by the "new season" and "edit season" admin forms. All of these
// counts are admin-entered per season (CLAUDE.md) — never hardcoded,
// since relegation/European-slot formats genuinely differ year to year.
export function SeasonFields({
  defaultValues,
}: {
  defaultValues?: {
    year?: number;
    teamCount?: number;
    directRelegationCount?: number;
    playoffRelegationCount?: number;
    europeanQualificationSlots?: number;
    predictionLockAt?: Date;
  };
}) {
  const lockAtDefault = defaultValues?.predictionLockAt
    ? defaultValues.predictionLockAt.toISOString().slice(0, 16)
    : undefined;

  return (
    <div className="space-y-4">
      <Field
        label="Starting year"
        name="year"
        defaultValue={defaultValues?.year}
        hint="Just the year the season kicks off in — e.g. enter 2026 for the 2026/27 season. Shown everywhere as 2026/27 automatically."
      />
      <Field label="Number of teams" name="teamCount" defaultValue={defaultValues?.teamCount} />
      <Field
        label="Direct relegation spots"
        name="directRelegationCount"
        defaultValue={defaultValues?.directRelegationCount}
      />
      <Field
        label="Playoff relegation spots"
        name="playoffRelegationCount"
        defaultValue={defaultValues?.playoffRelegationCount}
      />
      <Field
        label="European qualification slots"
        name="europeanQualificationSlots"
        defaultValue={defaultValues?.europeanQualificationSlots}
      />
      <div>
        <label className="text-bk-text-secondary text-sm font-medium" htmlFor="predictionLockAt">
          Prediction lock date &amp; time
        </label>
        <input
          id="predictionLockAt"
          name="predictionLockAt"
          type="datetime-local"
          defaultValue={lockAtDefault}
          required
          className="border-bk-border bg-bk-bg mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
