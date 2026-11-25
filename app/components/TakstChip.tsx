import { TAKSTER } from "@/app/utils/takstkartotek";

const BY_CODE = new Map(TAKSTER.map((t) => [t.code, t]));

/** Small badge with takst code and name, looked up in the takstkartotek. */
export default function TakstChip({ code }: { code: string }) {
  const takst = BY_CODE.get(code);
  return (
    <span className="takst-chip" title={takst ? `${takst.code}: ${takst.name}` : code}>
      <strong>{code}</strong>
      {takst && <span>{takst.name}</span>}
    </span>
  );
}

export function takstSummary(code: string) {
  const takst = BY_CODE.get(code);
  if (!takst) return null;
  const kr = (n: number | null) => (n === null ? "–" : `kr ${n.toLocaleString("nb-NO")}`);
  return `Honorar ${kr(takst.h)}, refusjon ${kr(takst.r)}, egenandel ${kr(takst.e)}`;
}
