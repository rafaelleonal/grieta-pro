import { RIOT_NOTICE_EN, RIOT_NOTICE_ES } from "@/lib/legal-notice";

export function RiotNotice() {
  return (
    <div
      aria-label="Aviso de Riot Games"
      className="max-w-3xl text-xs leading-relaxed text-neutral-400 [overflow-wrap:anywhere]"
    >
      <p>{RIOT_NOTICE_ES}</p>
      <p lang="en" className="mt-2 text-neutral-500">
        {RIOT_NOTICE_EN}
      </p>
    </div>
  );
}
