# Compliance Notes

Not legal advice — flagging areas to get real legal review on before scaling outbound volume, given the "a lot every day" target.

## Outbound calling/texting

- Business-to-business calls have more latitude than consumer calls under the TCPA, but sole proprietors / home-based businesses can still count as "residential" in some interpretations. Confirm with counsel before high-volume SMS/auto-dialing.
- Scrub against the National DNC Registry and maintain an internal do-not-contact list; honor opt-outs immediately across every channel (call, SMS, email).
- SMS at volume needs 10DLC registration and carrier-compliant opt-in language, or messages get filtered/blocked regardless of legality.

## Commercial financing disclosure laws

Several states (California SB 1235, New York, Utah, Virginia, Georgia, Florida) require specific disclosures on commercial financing offers, including MCAs, above certain size thresholds. State applicability depends on where the *borrower* is located, not where you operate. If leads span multiple states, disclosure requirements will vary per state — confirm the current list and thresholds with counsel, this list changes.

## Data handling

- UCC filings are public record; using them for outreach is standard industry practice, but confirm any vendor's data was sourced/refreshed lawfully.
- Store lead source + consent/contact history per record (the `lead_source` and contact-attempt fields in the n8n flow) so you can prove compliance if ever challenged.

## Action item

Get actual legal review before the daily volume ramps past a small pilot — this doc is a flag list, not a compliance program.
