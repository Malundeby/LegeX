-- One-time seed script. Run manually in the Supabase SQL Editor AFTER
-- 0001_grants_and_policies.sql. NOT an auto-run migration (this repo has no
-- migration tooling). Wrapped in begin/commit so a failed step (e.g. an
-- uncaught slug collision) leaves no partial data — fix and re-run safely.
--
-- For a full rebuild from an empty database, run in order:
--   0001_grants_and_policies.sql
--   0002_seed_content.sql (this file — does not set description)
--   0003_add_description_column.sql
--   0004_backfill_descriptions.sql
-- (description was added after this file was first run against production;
-- kept as a separate migration rather than rewritten in here to avoid two
-- copies of the same 65 description strings drifting out of sync.)
--
-- Scope notes (see plan for full rationale):
--   * "Lenker" is NOT seeded — it's a user-editable widget dashboard
--     (ModernWidgetDashboard), not static content.
--   * "Takster" gets exactly one row (the quiz link) — Takstkartoteket
--     itself is domain reference data, not link/document content.
--   * doak-dosing / anemia-assessment are seeded but left unpublished
--     (published_at = null), matching their hidden status in the app today.
--   * Eldre (over 70 år) / Nyresvikt / Vanligste interaksjoner are seeded
--     with url = null, published_at = null — they are dead "#" placeholders
--     in the app today; this makes them editable in admin without
--     re-publishing a known-broken link.

begin;

-- ============================================================
-- Step A: categories
-- ============================================================

insert into public.content_categories (section, name, sort_order) values
  ('Kalkulatorer', 'Andre', 0),
  ('Kalkulatorer', 'Endokrinologi', 1),
  ('Kalkulatorer', 'Gastromedisin', 2),
  ('Kalkulatorer', 'Hematologi', 3),
  ('Kalkulatorer', 'Kardiologi', 4),
  ('Kalkulatorer', 'Lungemedisin', 5),
  ('Kalkulatorer', 'Psykiatri', 6),
  ('Kalkulatorer', 'Revmatologi', 7),
  ('Kalkulatorer', 'Svangerskap', 8),
  ('Kalkulatorer', 'Urologi', 9),

  ('Verktøy', 'Lungemedisin', 0),
  ('Verktøy', 'Psykiatri', 1),
  ('Verktøy', 'Urologi', 2),
  ('Verktøy', 'Demens', 3),
  ('Verktøy', 'Revmatologi', 4),
  ('Verktøy', 'Nevrologi', 5),
  ('Verktøy', 'Øvrig', 6),
  ('Verktøy', 'Trygdemedisin', 7),

  ('Pasientinformasjon', 'Lungemedisin', 0),
  ('Pasientinformasjon', 'Kardiologi', 1),
  ('Pasientinformasjon', 'Revmatologi', 2),
  ('Pasientinformasjon', 'Gastroenterologi', 3),
  ('Pasientinformasjon', 'Dermatologi', 4),
  ('Pasientinformasjon', 'Psyk', 5),
  ('Pasientinformasjon', 'Muskel og skjelett', 6),
  ('Pasientinformasjon', 'Endokrinologi', 7),
  ('Pasientinformasjon', 'Øvrig', 8),

  ('Oversikter', 'Håndkort', 0),
  ('Oversikter', 'Annet', 1),

  ('Takster', 'Quiz', 0)
on conflict (section, name) do nothing;

-- ============================================================
-- Step B: content items
-- ============================================================

with cat as (
  select id, section, name from public.content_categories
),
v(section, category, type, slug, title, url, sort_order, published) as (
  values
    -- ---------------- Kalkulatorer ----------------
    ('Kalkulatorer', 'Andre', 'calculator', 'bmi', 'BMI', '/bmi', 0, true),
    ('Kalkulatorer', 'Andre', 'calculator', 'date-calculator', 'Datokalkulator', '/date-calculator', 1, true),
    ('Kalkulatorer', 'Andre', 'calculator', 'medication-calculator', 'Legemiddelberegner', '/medication-calculator', 2, true),
    ('Kalkulatorer', 'Andre', 'calculator', 'tapering-plan', 'Nedtrappingsplan', '/tapering-plan', 3, true),
    ('Kalkulatorer', 'Andre', 'calculator', 'pregnancy-calculator', 'Svangerskap', '/pregnancy-calculator', 4, true),
    ('Kalkulatorer', 'Andre', 'calculator', 'doak-dosing', '💊 DOAK-dosering', '/doak-dosing', 5, false),
    ('Kalkulatorer', 'Andre', 'calculator', 'anemia-assessment', '🩸 Anemivurdering', '/anemia-assessment', 6, false),

    ('Kalkulatorer', 'Endokrinologi', 'calculator', 'homa-ir', 'HOMA-IR', '/homa-ir', 0, true),
    ('Kalkulatorer', 'Endokrinologi', 'calculator', 'cpeptide-glucose', 'C-peptid/glukose-ratio', '/cpeptide-glucose', 1, true),

    ('Kalkulatorer', 'Gastromedisin', 'calculator', 'fib4', 'FIB-4', '/fib4', 0, true),
    ('Kalkulatorer', 'Gastromedisin', 'tool', 'alvarado', 'Alvarado-skår', '/alvarado', 1, true),

    ('Kalkulatorer', 'Hematologi', 'calculator', 'wells-dvt', 'Wells DVT', '/wells-dvt', 0, true),
    ('Kalkulatorer', 'Hematologi', 'calculator', 'wells-pe', 'Wells Lungeemboli', '/wells-pe', 1, true),

    ('Kalkulatorer', 'Kardiologi', 'calculator', 'ccs', 'CCS', '/ccs', 0, true),
    ('Kalkulatorer', 'Kardiologi', 'calculator', 'ccs-angina', 'CCS', '/ccs-angina', 1, true),
    ('Kalkulatorer', 'Kardiologi', 'calculator', 'nyha', 'NYHA', '/nyha', 2, true),
    ('Kalkulatorer', 'Kardiologi', 'calculator', 'chadsvasc', 'CHA₂DS₂-VA', '/chadsvasc', 3, true),
    ('Kalkulatorer', 'Kardiologi', 'calculator', 'hasbled', 'HAS-BLED', '/hasbled', 4, true),
    ('Kalkulatorer', 'Kardiologi', 'calculator', 'doac-score', 'DOAC-score', '/doac-score', 5, true),

    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'act', 'ACT voksne', '/act', 0, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'act-asthma', 'ACT voksne', '/act-asthma', 1, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'act-child', 'ACT barn', '/act-child', 2, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'mmrc', 'mMRC', '/mmrc', 3, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'cat', 'CAT', '/cat', 4, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'cat-copd', 'CAT', '/cat-copd', 5, true),
    ('Kalkulatorer', 'Lungemedisin', 'calculator', 'crb65', 'CRB-65', '/crb65', 6, true),

    ('Kalkulatorer', 'Psykiatri', 'tool', 'madrs', 'MADRS', '/madrs', 0, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'gad-7', 'GAD-7', '/gad-7', 1, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'asrs', 'ASRS v1.1', '/asrs', 2, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'audit', 'AUDIT - Kartlegging', '/audit', 3, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'ciwa-ar', 'CIWA-A - Abstinensskår', '/ciwa-ar', 4, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'ciwa-b', 'CIWA-B - Abstinensskår', '/ciwa-b', 5, true),
    ('Kalkulatorer', 'Psykiatri', 'tool', 'cage', 'CAGE - Rask screening', '/cage', 6, true),

    ('Kalkulatorer', 'Revmatologi', 'tool', 'eular-ra-2010', 'EULAR 2010 Revmatoid Artritt', '/eular-ra-2010', 0, true),
    ('Kalkulatorer', 'Revmatologi', 'tool', 'eular-pmr-2012', 'EULAR 2012 Polymyalgia Rheumatica', '/eular-pmr-2012', 1, true),

    ('Kalkulatorer', 'Svangerskap', 'link', 'obs-sukk-s', 'SUKK-S skår', 'https://www.google.com/search?q=SUKK-S+sk%C3%A5r', 0, true),

    ('Kalkulatorer', 'Urologi', 'calculator', 'psa-age-adjusted', 'Aldersjustert PSA', '/psa-age-adjusted', 0, true),
    ('Kalkulatorer', 'Urologi', 'calculator', 'ipss', 'IPSS-8', '/ipss', 1, true),

    -- ---------------- Verktøy ----------------
    ('Verktøy', 'Lungemedisin', 'document', 'act-astmakontrolltest-barn', 'ACT (Astmakontrolltest) – Barn', '/pdfs/Utredningsskjema-ACT-barn.pdf', 0, true),
    ('Verktøy', 'Lungemedisin', 'document', 'act-astmakontrolltest-voksne', 'ACT (Astmakontrolltest) – Voksne', '/pdfs/Utredningsskjema-ACT-voksne.pdf', 1, true),
    ('Verktøy', 'Lungemedisin', 'document', 'kols-cat', 'KOLS (CAT)', '/pdfs/Utredningsskjema-KOLS-(CAT).pdf', 2, true),

    ('Verktøy', 'Psykiatri', 'document', 'adult-adhd-quality-of-life', 'Adult ADHD Quality of Life', '/pdfs/Skjema-ADHD-Adult-ADHD-Quality-of-Life.pdf', 0, true),
    ('Verktøy', 'Psykiatri', 'document', 'verktoy-asrs', 'ASRS', '/pdfs/Utredningsskjema-ASRS.pdf', 1, true),
    ('Verktøy', 'Psykiatri', 'document', 'verktoy-audit', 'AUDIT', '/pdfs/TBR-AUDIT.pdf', 2, true),
    ('Verktøy', 'Psykiatri', 'document', 'ciwa-alkohol', 'CIWA - alkohol', '/pdfs/Utredningsverktøy-CIWA-alkohol.pdf', 3, true),
    ('Verktøy', 'Psykiatri', 'document', 'ciwa-benzodiazepiner', 'CIWA - benzodiazepiner', '/pdfs/Utredningsverk-CIWA-skjema benzodiazepiner.pdf', 4, true),
    ('Verktøy', 'Psykiatri', 'document', 'verktoy-gad-7', 'GAD-7', '/pdfs/TBR-GAD-7-pdf.pdf', 5, true),
    ('Verktøy', 'Psykiatri', 'document', 'verktoy-madrs-pasientutfylling', 'MADRS – Pasientutfylling', '/pdfs/Utredningsskjema-MADRS-pasientutgave.pdf', 6, true),
    ('Verktøy', 'Psykiatri', 'document', 'verktoy-madrs-klinikerutfylling', 'MADRS – Klinikerutfylling', '/pdfs/Utredningsskjema-MADRS-klinikerutgave.pdf', 7, true),
    ('Verktøy', 'Psykiatri', 'document', 'phq-9', 'PHQ-9', '/pdfs/TBR-PHQ-9.pdf', 8, true),
    ('Verktøy', 'Psykiatri', 'document', 'y-bocs', 'Y-BOCS', '/pdfs/TBR-Y-BOCS.pdf', 9, true),

    ('Verktøy', 'Urologi', 'document', 'verktoy-ipss', 'IPSS', '/pdfs/Utredningsskjema-IPSS.pdf', 0, true),

    ('Verktøy', 'Demens', 'document', 'i-og-p-adl', 'I- og P-ADL', '/pdfs/Skjema-Demens-I-ADL%20og%20P-ADL.pdf', 0, true),
    ('Verktøy', 'Demens', 'document', 'tmt-testark', 'Trail Making Test (TMT) – Testark', '/pdfs/Utredningsskjema-Demens-TMT-NR3-testark.pdf', 1, true),
    ('Verktøy', 'Demens', 'document', 'tmt-instruksjoner', 'Trail Making Test (TMT) – Instruksjoner', '/pdfs/Utredningsskjema-Demens-TMT-NR3-manual.pdf', 2, true),
    ('Verktøy', 'Demens', 'document', 'barthel-adl-index', 'Barthel ADL-index', '/pdfs/Funksjonsnivå-Barthel-ADL-index.pdf', 3, true),
    ('Verktøy', 'Demens', 'document', 'mmse-testark', 'MMSE – Testark', '/pdfs/Utredningsverktøy-MMSE-testark.pdf', 4, true),
    ('Verktøy', 'Demens', 'document', 'mmse-instruksjoner', 'MMSE – Instruksjoner', '/pdfs/Utredningsverktøy-MMSE-veiledning.pdf', 5, true),

    ('Verktøy', 'Revmatologi', 'document', 'fibromyalgi', 'Fibromyalgi', '/pdfs/Skjema-Revma-Fibromyalgikartlegging.pdf', 0, true),

    ('Verktøy', 'Nevrologi', 'document', '3x3-triptan', '3x3 Triptan', '/pdfs/Skjema-Migrene-3x3-Triptan-.pdf', 0, true),
    ('Verktøy', 'Nevrologi', 'document', 'hodepineutredning', 'Hodepineutredning', '/pdfs/Skjema-Nevro-Hodepineutredning.pdf', 1, true),
    ('Verktøy', 'Nevrologi', 'document', 'pin-test', 'PIN-test', '/pdfs/Skjema-Migrene-PIN-test.pdf', 2, true),
    ('Verktøy', 'Nevrologi', 'document', 'hit-6', 'HIT-6', '/pdfs/Skjema-Nevro-HIT-6.pdf', 3, true),

    ('Verktøy', 'Øvrig', 'document', 'smertekartlegging', 'Smertekartlegging', '/pdfs/Skjema-ESAS-Smertekartlegging.pdf', 0, true),
    ('Verktøy', 'Øvrig', 'document', 'kostprovokasjon', 'Kostprovokasjon', '/pdfs/Øvrig-Kostprovokasjon-(RIkshosp).pdf', 1, true),
    ('Verktøy', 'Øvrig', 'document', 'kostregistrering', 'Kostregistrering', '/pdfs/Øvrig-TBR-Kostregistrering.pdf', 2, true),
    ('Verktøy', 'Øvrig', 'document', 'sovndagbok', 'Søvndagbok', '/pdfs/Skjema-Øvrig-Søvndagbok.pdf', 3, true),
    ('Verktøy', 'Øvrig', 'document', 'canada-kriteriene-for-me', 'Canada-kriteriene for ME', '/pdfs/Skjema-ME-Canada-kriteriene.pdf', 4, true),
    ('Verktøy', 'Øvrig', 'document', 'cfs', 'CFS', '/pdfs/Utredningsskjema-CFS-skjema.pdf', 5, true),

    ('Verktøy', 'Trygdemedisin', 'document', 'norsk-funksjonsskjema', 'Norsk funksjonsskjema', '/pdfs/Skjema-Trygdemedisin-Norsk%20funksjonsskjema.pdf', 0, true),
    ('Verktøy', 'Trygdemedisin', 'document', 'sykmeldingsoppfolgning', 'Sykmeldingsoppfølgning', '/pdfs/Trygdemedisin-Sykmeldingsoppf%C3%B8lgning.pdf', 1, true),

    -- ---------------- Pasientinformasjon ----------------
    ('Pasientinformasjon', 'Lungemedisin', 'document', 'egenbehandling-kols', 'Egenbehandling KOLS', '/pdfs/Egenbehandlingsplan-KOLS.pdf', 0, true),
    ('Pasientinformasjon', 'Lungemedisin', 'document', 'egenbehandling-astma', 'Egenbehandling astma', '/pdfs/Egenbehandlingsplan-Astma.pdf', 1, true),

    ('Pasientinformasjon', 'Kardiologi', 'document', 'hjemmemaling-bt-instruksjoner-og-maleark', 'Hjemmemåling BT – Instruksjoner og måleark', '/pdfs/HjemmeBT.pdf', 0, true),
    ('Pasientinformasjon', 'Kardiologi', 'document', 'hjemmemaling-bt-kun-maleark', 'Hjemmemåling BT – Kun måleark', '/pdfs/HjemmeBT-kun-registrering.pdf', 1, true),

    ('Pasientinformasjon', 'Revmatologi', 'document', 'polymyalgia-revmatika', 'Polymyalgia revmatika', '/pdfs/Behandlingsplan-Polymyalgia-rheumtica.pdf', 0, true),

    ('Pasientinformasjon', 'Gastroenterologi', 'document', 'sure-oppstot-gerd', 'Sure oppstøt (GERD)', '/pdfs/Pasinfo-GERD.pdf', 0, true),
    ('Pasientinformasjon', 'Gastroenterologi', 'document', 'ppi-nedtrapping', 'PPI-nedtrapping', '/pdfs/Behandlingsplaner-PPI-nedtrapping.pdf', 1, true),

    ('Pasientinformasjon', 'Dermatologi', 'document', 'eksembehandling', 'Eksembehandling', '/pdfs/Pasinfo-Derma-Eksembehandling.pdf', 0, true),
    ('Pasientinformasjon', 'Dermatologi', 'document', 'foflekksjekk-egenbehandling', 'Føflekksjekk egenbehandling', '/pdfs/Pasinfo-Derma-Føflekker-Egensjekk.pdf', 1, true),
    ('Pasientinformasjon', 'Dermatologi', 'document', 'vortebehandling', 'Vortebehandling', '/pdfs/Behandlingsplaner-Vortebehandling.pdf', 2, true),
    ('Pasientinformasjon', 'Dermatologi', 'document', 'psoriasis-i-hodebunn', 'Psoriasis i hodebunn', '/pdfs/Behandlingsplaner-Psoriasis-i-hodebunn.pdf', 3, true),
    ('Pasientinformasjon', 'Dermatologi', 'document', 'akne-isotretionin', 'Akne (Isotretionin)', '/pdfs/Akne-iso.pdf', 4, true),
    ('Pasientinformasjon', 'Dermatologi', 'document', 'akne-lokalbehandling', 'Akne (lokalbehandling)', '/pdfs/Akne-lokalbehandling.pdf', 5, true),

    ('Pasientinformasjon', 'Psyk', 'document', 'prioriteringsmatrise', 'Prioriteringsmatrise', '/pdfs/Psyk-Prioriteringsmatrise.pdf', 0, true),
    ('Pasientinformasjon', 'Psyk', 'document', 'trafikklysmodell-psykisk-helsearbeid', 'Trafikklysmodell – Psykisk helsearbeid', '/pdfs/Trafikklysmodell%E2%80%93Psykisk-helsearbeid.pdf', 1, true),

    ('Pasientinformasjon', 'Muskel og skjelett', 'link', 'start-ovelser', 'Start-øvelser', 'https://www.exorlive.com/no/start-ovelser', 0, true),
    ('Pasientinformasjon', 'Muskel og skjelett', 'document', 'ovelser-ved-ryggsmerter', 'Øvelser ved ryggsmerter', '/pdfs/Fysio-Øvelser-ryggsmerter.pdf', 1, true),
    ('Pasientinformasjon', 'Muskel og skjelett', 'document', 'plantar-fasciitt', 'Plantar fasciitt', '/pdfs/Pasinfo-Plantar%20fasciiti.pdf', 2, true),
    ('Pasientinformasjon', 'Muskel og skjelett', 'document', 'senebetennelse', 'Senebetennelse', '/pdfs/Behandlingsplan-Senebetennelse.pdf', 3, true),

    ('Pasientinformasjon', 'Endokrinologi', 'document', 'diabetisk-fotsar-lav-risiko', 'Diabetisk fotsår – Lav risiko', '/pdfs/Diabetisk-fotsår-lav-risiko.pdf', 0, true),
    ('Pasientinformasjon', 'Endokrinologi', 'document', 'diabetisk-fotsar-medium-risiko', 'Diabetisk fotsår – Medium risiko', '/pdfs/Diabetisk-fotsår-medium-risiko.pdf', 1, true),
    ('Pasientinformasjon', 'Endokrinologi', 'document', 'diabetisk-fotsar-hoy-risiko', 'Diabetisk fotsår – Høy risiko', '/pdfs/Diabetisk-fotsår-høy-risiko.pdf', 2, true),

    ('Pasientinformasjon', 'Øvrig', 'document', 'sarotex', 'Sarotex', '/pdfs/Behandlingsplaner-Sarotex.pdf', 0, true),

    -- ---------------- Oversikter ----------------
    ('Oversikter', 'Håndkort', 'document', 'apotekkort', 'Apotekkort', '/pdfs/Håndkort-Apotekkort-ToppenLS.pdf', 0, true),
    ('Oversikter', 'Håndkort', 'document', 'henvisningskort', 'Henvisningskort', '/pdfs/Håndkort-Henvisningskort-ToppenLS.pdf', 1, true),
    ('Oversikter', 'Håndkort', 'document', 'sykedagskort', 'Sykedagskort', '/pdfs/Håndkort-Sykedagskort.pdf', 2, true),
    ('Oversikter', 'Håndkort', 'document', 'videre-plan', 'Videre plan', '/pdfs/Håndkort-Videre%20plan-ToppenLS.pdf', 3, true),

    ('Oversikter', 'Annet', 'document', 'knuse-dele-listen', 'Knuse-dele-listen', '/pdfs/KnuseDeleListen v16.pdf', 0, true),
    ('Oversikter', 'Annet', 'document', 'eldre-over-70-ar', 'Eldre (over 70 år)', null, 1, false),
    ('Oversikter', 'Annet', 'document', 'nyresvikt', 'Nyresvikt', null, 2, false),
    ('Oversikter', 'Annet', 'document', 'vanligste-interaksjoner', 'Vanligste interaksjoner', null, 3, false),
    ('Oversikter', 'Annet', 'document', 'osteoporose', 'Osteoporose', '/pdfs/Pasientinformasjon-Osteoporose.pdf', 4, true),

    -- ---------------- Takster ----------------
    ('Takster', 'Quiz', 'quiz', 'quiz', 'Takstquiz', '/quiz', 0, true)
)
insert into public.content_items (section, category_id, type, slug, title, url, icon_url, sort_order, published_at)
select
  v.section,
  cat.id,
  v.type,
  v.slug,
  v.title,
  v.url,
  null,
  v.sort_order,
  case when v.published then now() else null end
from v
join cat on cat.section = v.section and cat.name = v.category;

commit;
