import { RIOT_NOTICE_EN, RIOT_NOTICE_ES } from "@/lib/legal-notice";

export function RiotNotice() {
  return (
    <div className="riot-notice" aria-label="Aviso de Riot Games">
      <p>{RIOT_NOTICE_ES}</p>
      <p lang="en">{RIOT_NOTICE_EN}</p>
    </div>
  );
}
