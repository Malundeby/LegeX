-- Run once, manually, in the Supabase SQL Editor, AFTER 0003.
-- Backfills the description column (added in 0003) for the rows that were
-- already inserted by 0002, for the three PDF-grid sections whose UI
-- displays a description (Verktøy, Pasientinformasjon, Oversikter).
-- Kalkulatorer/Takster rows have no description in the app today and are
-- left as-is (null).

begin;

update public.content_items as ci
set description = d.description
from (
  values
    -- Verktøy
    ('act-astmakontrolltest-barn', 'Astmakontroll'),
    ('act-astmakontrolltest-voksne', 'Astmakontroll'),
    ('kols-cat', 'Vurdering av KOLS-symptomer'),
    ('adult-adhd-quality-of-life', 'Livskvalitetsvurdering ved voksen ADHD'),
    ('verktoy-asrs', 'Utredningsskjema for ADHD'),
    ('verktoy-audit', 'Vurdering av alkoholbruk'),
    ('ciwa-alkohol', 'Vurdering av alkoholabstinens'),
    ('ciwa-benzodiazepiner', 'Vurdering av benzodiazepinabstinens'),
    ('verktoy-gad-7', 'Vurdering av angstsymptomer'),
    ('verktoy-madrs-pasientutfylling', 'Vurdering av depresjon'),
    ('verktoy-madrs-klinikerutfylling', 'Vurdering av depresjon'),
    ('phq-9', 'Vurdering av depresjon'),
    ('y-bocs', 'Vurdering av tvangssymptomer (OCD)'),
    ('verktoy-ipss', 'Vurdering av vannlatningsplager'),
    ('i-og-p-adl', 'Kartlegging av instrumentelle og personlige daglige aktiviteter'),
    ('tmt-testark', 'Utredningsskjema for demens – TMT-3'),
    ('tmt-instruksjoner', 'Utredningsskjema for demens – TMT-3'),
    ('barthel-adl-index', 'Kartlegging av funksjonsnivå ved demens'),
    ('mmse-testark', 'Utredningsverktøy for demens'),
    ('mmse-instruksjoner', 'Utredningsverktøy for demens'),
    ('fibromyalgi', 'Kartlegging av fibromyalgi'),
    ('3x3-triptan', 'Registrering av triptanbruk ved migrene'),
    ('hodepineutredning', 'Utredningsskjema for hodepine'),
    ('pin-test', 'PIN-test ved migrene'),
    ('hit-6', 'Vurdering av hodepinebelastning'),
    ('smertekartlegging', 'Kartlegging av smerte og symptomer (ESAS)'),
    ('kostprovokasjon', 'Skjema for kostprovokasjon (Rikshospitalet)'),
    ('kostregistrering', 'Registrering av kosthold'),
    ('sovndagbok', 'Registrering av søvnmønster'),
    ('canada-kriteriene-for-me', 'Diagnostiske kriterier for ME/CFS'),
    ('cfs', 'Utredningsverktøy for kronisk utmattelsessyndrom'),
    ('norsk-funksjonsskjema', 'Kartlegging av funksjonsnivå ved trygdemedisinske vurderinger'),
    ('sykmeldingsoppfolgning', 'Veiledning for oppfølgning av sykmeldte pasienter'),

    -- Pasientinformasjon
    ('egenbehandling-kols', 'Egenbehandlingsplan for KOLS'),
    ('egenbehandling-astma', 'Egenbehandlingsplan for astma'),
    ('hjemmemaling-bt-instruksjoner-og-maleark', 'Hjemmemåling av blodtrykk'),
    ('hjemmemaling-bt-kun-maleark', 'Hjemmemåling av blodtrykk'),
    ('polymyalgia-revmatika', 'Behandlingsplan for polymyalgia revmatika'),
    ('sure-oppstot-gerd', 'Pasientinformasjon om sure oppstøt og gastroøsofageal reflukssykdom'),
    ('ppi-nedtrapping', 'Behandlingsplan for nedtrapping av PPI'),
    ('eksembehandling', 'Pasientinformasjon om behandling av eksem'),
    ('foflekksjekk-egenbehandling', 'Pasientinformasjon om egensjekk av føflekker'),
    ('vortebehandling', 'Behandlingsplan for vortebehandling'),
    ('psoriasis-i-hodebunn', 'Behandlingsplan for psoriasis i hodebunn'),
    ('akne-isotretionin', 'Pasientinformasjon om behandling med isotretinoin'),
    ('akne-lokalbehandling', 'Pasientinformasjon om lokalbehandling av akne'),
    ('prioriteringsmatrise', 'Prioriteringsmatrise for psykisk helsearbeid'),
    ('trafikklysmodell-psykisk-helsearbeid', 'Trafikklysmodell for vurdering i psykisk helsearbeid'),
    ('start-ovelser', 'Øvelsesprogram for ulike kroppsdeler (ExorLive)'),
    ('ovelser-ved-ryggsmerter', 'Fysioterapiøvelser ved ryggsmerter'),
    ('plantar-fasciitt', 'Pasientinformasjon om øvelser ved plantar fasciitt'),
    ('senebetennelse', 'Behandlingsplan for senebetennelse'),
    ('diabetisk-fotsar-lav-risiko', 'Pasientinformasjon om diabetisk fotsår, etter risikonivå'),
    ('diabetisk-fotsar-medium-risiko', 'Pasientinformasjon om diabetisk fotsår, etter risikonivå'),
    ('diabetisk-fotsar-hoy-risiko', 'Pasientinformasjon om diabetisk fotsår, etter risikonivå'),
    ('sarotex', 'Behandlingsplan for sarotex'),

    -- Oversikter
    ('apotekkort', 'Håndkort for apotekrelatert oppfølging.'),
    ('henvisningskort', 'Håndkort for rask henvisningsstøtte.'),
    ('sykedagskort', 'Håndkort for strukturert sykedagsvurdering.'),
    ('videre-plan', 'Håndkort for planlegging av videre forløp.'),
    ('knuse-dele-listen', 'Knuse-dele-listen'),
    ('eldre-over-70-ar', 'Spesielle hensyn ved dosering til eldre pasienter'),
    ('nyresvikt', 'Dosejustering ved redusert nyrefunksjon'),
    ('vanligste-interaksjoner', 'Viktige legemiddelinteraksjoner å vurdere'),
    ('osteoporose', 'Pasientinformasjon om osteoporose')
) as d(slug, description)
where ci.slug = d.slug;

commit;
