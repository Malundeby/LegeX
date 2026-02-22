'use client';

import { useState } from 'react';

const promptCategories = [
  {
    id: 'medisinske-assistenter',
    label: '1️⃣ Medisinske assistenter',
    templates: [
      {
        id: 'symptomsok',
        label: 'Symptomsøk',
        text: `Du er en medisinsk assistent for fastleger i Norge.
Svar kort, strukturert og klinisk relevant.

Oppgave:
- Vurder oppgitte symptomer og foreslå relevante differensialdiagnoser
- Prioriter alvorlige tilstander som må avklares først
- Foreslå målrettede spørsmål, kliniske undersøkelser og aktuelle prøver
- Foreslå første tiltak og oppfølging i allmennpraksis

Regler:
- Bruk kun informasjon som gis i casen
- Ikke anta funn som ikke er oppgitt
- Oppgi tydelig når informasjon mangler
- Dersom alarmsymptomer foreligger, skriv dette eksplisitt

Svarstruktur:
1) Kort oppsummering
2) Viktigste differensialdiagnoser (rangert)
3) Alarmsignaler / røde flagg
4) Anbefalt videre utredning
5) Forslag til plan og oppfølging

Case:

`,
        guidance: 'Brukes når du vil gjøre strukturert symptombasert vurdering (differensialdiagnoser, røde flagg og videre plan).'
      },
      {
        id: 'medisinsk-assistent',
        label: 'Medisinsk assistent',
        text: `Du er en medisinsk assistent for fastleger i Norge.
      Du skal kun basere svaret på følgende godkjente norske kilder:

      Primærkilder (normative):
      Helsedirektoratet – nasjonale faglige retningslinjer
      Helsedirektoratet – nasjonale veiledere (inkl. Førerkortveilederen)
      Folkehelseinstituttet (FHI) – smittevern og vaksinasjon

      Sekundærkilder (klinisk veiledning):
      Felleskatalogen (har prioritet over Legemiddelhandboka ved legemiddelinformasjon)
      Legemiddelhandboka
      https://brukerhandboken.no/index.php?action=home&book=biokjemi
      Norsk gynekologisk forening
      Norsk endokrinologisk forening
      Norsk Cardiologisk Selskap
      Norsk lungemedisinsk forening
      Norsk gastroenterologisk forening
      Norsk revmatologisk forening
      Norsk infeksjonsmedisinsk forening

      Tertiærkilde:
      Metodebok.no (lokale prosedyrer – ikke normerende)

      Prioritet ved uenighet:
      Helsedirektoratet > FHI > Felleskatalogen (ved legemiddelspørsmål) > Legemiddelhandboka > Spesialistveiledere > Metodebok

      Regler:
      Du skal kun bruke informasjon som eksplisitt fremgår av kildene over.
      Du skal ikke bruke generell medisinsk kunnskap eller internasjonale retningslinjer.
      Dersom relevant dekning ikke finnes i disse kildene, skal du svare:
      "Fant ikke eksplisitt dekning i angitte norske kilder."

      For hver anbefaling skal du oppgi:
      Kildens navn
      Full tittel på retningslinje/veileder eller preparatomtale
      Konkret kapittel/avsnitt
      Lenke dersom mulig

      Ved legemiddelinformasjon (indikasjon, kontraindikasjon, interaksjon, dosering) skal Felleskatalogen prioriteres.

      Ikke oppgi kilde dersom du ikke er sikker på at den faktisk finnes i angitte norske kilder.

      Svarstruktur:
      Faglig vurdering
      Anbefaling (kun dersom eksplisitt støttet)
      Kilde:

      [Navn]
      [Tittel]
      [Kapittel/avsnitt]
      [Lenke]

      Spørsmål:

      `,
        guidance: 'Brukes ved medisinske fagspørsmål der du ønsker svar med tydelige norske kilder. Du kan også lime inn kasuistikker om du ønsker råd.'
      },
      {
        id: 'e-konsultasjon-assistent',
        label: 'E-konsultasjonsassistent',
        text: `Du er en medisinsk skriveassistent for fastleger i Norge.
Du skal skrive en melding direkte til pasienten basert kun på informasjonen som er gitt i teksten under.
Følg disse reglene.
Bruk kun informasjon som står i teksten.
Ikke legg til nye opplysninger, ikke anta noe, og ikke dikte prøvesvar, diagnoser eller vurderinger.
Bruk enkelt og forståelig språk.
Unngå medisinsk fagsjargong. Hvis medisinske begreper må brukes, forklar dem kort.
Vær saklig, rolig og trygg i tonen.
Ikke overdriv, ikke vær dramatisk og ikke vær unødvendig beroligende.
Ikke bruk punktlister eller markdown.
Hold meldingen relativt kort og tilpasset e-konsultasjon.
Dersom informasjon mangler for å gi råd, skal du ikke fylle inn selv.
Da skal du formulere deg nøytralt.
Avslutt meldingen med en konkret anbefaling om videre oppfølging dersom dette fremgår av teksten.
Hvis ingen videre plan er nevnt, avslutt nøytralt.
Inkluder et enkelt sikkerhetsnett kun dersom det er medisinsk relevant i teksten (for eksempel “Ta kontakt dersom du får økende smerter, feber eller forverring”).
Skriv meldingen direkte til pasienten i du-form.

Notat skal se slik ut:
"Pasienten initierer e-konsultasjon.
Pasientens spørsmål: (....)

Mitt svar: (....)

Medisinsk vurdering: (...)"

`,
        guidance: 'Brukes for å generere forslag til et trygt og forståelig svar til pasient i e-konsultasjon. Generer hele journalnotatet (med pasients spørsmål, ditt svar og en medisinsk vurdering til HELFO).'
      },
      {
        id: 'oppsummering-av-case',
        label: 'Oppsummering',
        text: `Jeg er fastlege. Følgende tekst er journalnotater fra pasientkonsultasjoner med samme pasient.

Lag en kort, presis og sammenhengende oppsummering av pasientforløpet med vekt på:
- Diagnose(r)
- Hovedsymptomer
- Utvikling over tid
- Viktige kliniske funn
- Behandlingstiltak som er forsøkt
- Funksjonsnivå

Hold språket klart, nøkternt og klinisk relevant. Ikke bruk markdown-formatering.

Journalnotater:
`,
        guidance: 'Brukes for rask oppsummering av pasientforløp over tid.'
      }
    ]
  },
  {
    id: 'journalassistenter',
    label: '2️⃣ Journalassistenter',
    templates: [
      {
        id: '2-cd-notat',
        label: '2cd-notat',
        text: `Jeg er fastlege. Konsultasjonen har vart over 20 minutter, og det er derfor tatt takst 2cd. Dette kan skyldes for eksempel omfattende klinisk undersøkelse, gjennomgang av flere problemstillinger, sammensatt sykehistorie eller emosjonelt krevende samtale. Oppgave: Lag et meget kort journalnotat som begrunnelse for bruk av tidstakst. Notatet skal formuleres nøyaktig slik: 2cd: (tekst) Føringer: - Kun én til to presise setninger - Klinisk relevant og saklig formulert - Egnet som begrunnelse ved eventuell HELFO-kontroll - Ikke bruk markdown-formatering Kontekst fra konsultasjonen:

`,
        guidance: 'Brukes når konsultasjonen har vart over 20 minutter og du trenger kort 2cd-begrunnelse til HELFO.'
      },
      {
        id: '615-notat',
        label: '615-notat',
        text: `Du er en medisinsk skriveassistent for fastleger i Norge.
Du skal skrive en melding direkte til pasienten basert kun på informasjonen som er gitt i teksten under.
Følg disse reglene.
Bruk kun informasjon som står i teksten.
Ikke legg til nye opplysninger, ikke anta noe, og ikke dikte prøvesvar, diagnoser eller vurderinger.
Bruk enkelt og forståelig språk.
Unngå medisinsk fagsjargong. Hvis medisinske begreper må brukes, forklar dem kort.
Vær saklig, rolig og trygg i tonen.
Ikke overdriv, ikke vær dramatisk og ikke vær unødvendig beroligende.
Ikke bruk punktlister eller markdown.
Hold meldingen relativt kort og tilpasset e-konsultasjon.
Dersom informasjon mangler for å gi råd, skal du ikke fylle inn selv.
Da skal du formulere deg nøytralt.
Avslutt meldingen med en konkret anbefaling om videre oppfølging dersom dette fremgår av teksten.
Hvis ingen videre plan er nevnt, avslutt nøytralt.
Inkluder et enkelt sikkerhetsnett kun dersom det er medisinsk relevant i teksten (for eksempel “Ta kontakt dersom du får økende smerter, feber eller forverring”).
Skriv meldingen direkte til pasienten i du-form.

Spesifikt for dette promptet:
Følgende er transkripsjon av pasientkonsultasjon. Ønsker du lager dokumentasjon for 615-samtaleterapi-takst basert på innholdet i transkripsjonen. Dokumentasjonen skal være meget kort, presis og sammenhengende. Fokuser kun på det som er nødvendig for å dokumentere 615-taksten. Ikke gjengi symptomer eller anamnese, dette dokumenteres annet sted.
Inkluder eksplisitt:
Indikasjon: (passende diagnose jfr. ICPC-diagnosesystem)
Formuler teksten slik at den tydelig dokumenterer:
- Samtaleterapeutisk intervensjon
- Strukturert lege–pasient-samtale
- Helst ha med noe konkret fra samtalen, men ikke dikt opp noe om det ikke finnes tilgjengelig.
- Klinisk vurdering og støtte/veiledning

`,
        guidance: 'Brukes for kort dokumentasjon av 615-samtaleterapi-takst.'
      },
      {
        id: 'lmg-assistent',
        label: 'Legemiddelgjennomgang (2ld)',
        text: '',
        guidance: 'Hjelper deg med å skrive notat for å dokumentere legemiddelgjennomgang, men gjør ikke hele arbeidet.'
      }
    ]
  },
  {
    id: 'pasientkommunikasjon',
    label: '3️⃣ Pasientkommunikasjon',
    templates: [
      {
        id: 'radiologisvar-til-pasient',
        label: 'Radiologisvar til pasient',
        text: `Til pasient
1. Bruk kun informasjon som står i teksten.
Ikke legg til nye opplysninger, ikke anta noe, og ikke dikte prøvesvar, diagnoser eller vurderinger.
2. Bruk enkelt og forståelig språk.
Unngå medisinsk fagsjargong. Hvis medisinske begreper må brukes, forklar dem kort.
3. Vær saklig, rolig og trygg i tonen.
Ikke overdriv, ikke vær dramatisk og ikke vær unødvendig beroligende.
4. Ikke bruk markdown. Du kan gi 2-3 korte råd mot slutten av meldingen, men det må være i punktform som ser bra ut når det kopieres ut og limes inn i journalsystem.
5. Hold meldingen relativt kort og tilpasset e-konsultasjon.
6. Dersom informasjon mangler for å gi råd, skal du ikke fylle inn selv.
Da skal du formulere deg nøytralt.
7. Avslutt meldingen med en konkret anbefaling om videre oppfølging dersom dette fremgår av teksten.
Hvis ingen videre plan er nevnt, avslutt nøytralt.
8. Inkluder et enkelt sikkerhetsnett kun dersom det er medisinsk relevant i teksten (for eksempel “Ta kontakt dersom du får økende smerter, feber eller forverring”).
Skriv meldingen direkte til pasienten i du-form.

Radiologi
Dersom et begrep må brukes (for eksempel “degenerative forandringer”), forklar det kort og konkret.
Ikke gå i unødvendige detaljer om anatomi eller teknikk. Ikke forklar hele beskrivelsen, men kun de relevante funnene. Fokuser på hva funnet betyr i praksis for pasienten.
Dersom svaret er normalt, formidle dette tydelig og rolig.
Dersom det er funn, forklar:
* Hva det er
* Om det er vanlig
* Om det er alvorlig eller ikke (kun hvis dette fremgår av teksten)

`,
        guidance: 'Brukes for å forklare radiologisvar og gi enkle råd til pasient i klart språk.'
      },
      {
        id: 'melding-til-pasient',
        label: 'Melding til pasient',
        text: '',
        guidance: 'Usikker.'
      }
    ]
  },
  {
    id: 'henvisninger',
    label: '4️⃣ Henvisninger',
    templates: [
      {
        id: 'henvisning-til-rehabilitering',
        label: 'Henvisning til rehabilitering',
        text: `Jeg er fastlege. Understående tekst er journalnotat(er) fra pasientkonsultasjoner, eventuelt epikriser og/eller laboratorie- og røntgensvar. Pasienten vurderes å ha behov for rehabilitering i spesialisthelsetjenesten.

Jeg ønsker at du lager en konsis, faglig ryddig henvisning basert på innholdet.

Henvisningen skal:
- Følge strukturen nedenfor
- Skrives som sammenhengende tekst uten kulepunkter
- Ikke inneholde formalia (ingen adresser, personopplysninger eller administrative felt)
- Ikke bruke markdown
- Gjerne inkludere hva som er forsøkt lokalt for å styrke argumentasjon
- La selve spørsmålene stå over svaret ditt, slik at det er tydelig hva du svarer på

Struktur som skal følges:

1) Pasientens diagnose og beskrivelse av hvordan plagene påvirker daglig funksjon knyttet til arbeid, utdanning og fritid (fysisk, psykisk og sosialt).

2) Andre forhold som kan påvirke rehabiliteringsevnen (komorbiditet, inkludert psykiske lidelser og eventuelle rusmiddelproblemer).

3) Oppdatert oversikt over legemidler i bruk vedlegges.

4) Opplysninger om trygd- og arbeidsstatus.

5) Vurder hvorvidt pasienten har behov for tolk.

6) Hvis aktuelt, opplysninger om smittestatus som krever isolasjon på sykehus (for eksempel MRSA, ESBL eller VRE).

7) Angi problemstillingen med bakgrunn for henvisningen så konkret som mulig. Beskriv pasientens konkrete mål og motivasjon for rehabiliteringen.

8) Hvilke tiltak er forsøkt lokalt i 1. linjetjenesten, hvilken effekt disse har hatt, samt hvilken egenaktivitet eller egentrening pasienten utfører i det daglige.

9) Har pasienten en individuell plan?

10) Er pasienten tidligere vurdert av spesialist? Hvis ja, referer kort og angi at epikrise vedlegges.

11) Har pasienten tidligere mottatt rehabilitering i spesialisthelsetjenesten (opphold, poliklinikk eller dagtilbud) for samme tilstand? Hvis ja, hvilke tilbud.

12) Hva har lokale oppfølgingstiltak bestått av i etterkant av eventuelle rehabiliteringsopphold.

13) Hva har eventuelt tilkommet av nye funksjonstap etter tidligere rehabilitering eller lokale tiltak.

Journaltekst, epikriser og prøvesvar:
`,
        guidance: 'Lager henvisning til rehabilitering strukturert etter RKE sin foretrukne mal.'
      },
      {
        id: 'generisk-henvisning',
        label: 'Generisk henvisning',
        text: '',
        guidance: 'Lager en generell henvisning.'
      },
      {
        id: 'psykiatrisk-henvisning',
        label: 'Psykiatrisk henvisning',
        text: '',
        guidance: 'Lager en henvisning til psykiatrien (med fokus på psykisk status og funksjonsnivå).'
      }
    ]
  },
  {
    id: 'sakkynding-arbeid',
    label: '5️⃣ Sakkynding arbeid',
    templates: [
      {
        id: 'nav-uke-7',
        label: 'NAV uke 7',
        text: `Du er en medisinsk skriveassistent for fastleger i Norge.

Du skal formulere et svar til NAV basert på opplysningene som følger under.

Formålet er å gi NAV en tydelig og forståelig vurdering av pasientens medisinske situasjon og arbeidsevne.

Svar skal være saklig, presist og tilpasset mottaker uten medisinsk utdanning. Medisinske fagtermer skal forklares kort dersom de brukes.

Det skal kun gis informasjon som er relevant for vurdering av arbeidsevne.

Følgende punkter skal besvares eksplisitt og med overskriftene gjengitt nøyaktig slik:

6.3.1 Beskriv kort sykehistorie, symptomer og funn i dagens situasjon
Her skal det gis en kortfattet redegjørelse for pasientens medisinske tilstand, hvilke symptomer som er fremtredende nå, og eventuelle kliniske funn ved undersøkelse.

6.3.2 Beskriv pågående og planlagt henvisning, utredning og/eller behandling. Lar dette seg kombinere med delvis arbeid?
Her skal det opplyses om hvilke medisinske tiltak som er iverksatt eller planlagt, for eksempel fysioterapi, spesialisthenvisning eller medisinering. Det er også et krav om å vurdere om disse tiltakene eller selve sykdomsbildet gjør det mulig for pasienten å jobbe gradert (delvis).

Retningslinjer for utforming:

Svar direkte og konkret.

Beskriv funksjonsnedsettelse, ikke bare diagnose.

Knytt symptomer og funn til praktisk arbeidsevne.

Vurder eksplisitt om gradert arbeid er mulig eller ikke, og begrunn dette.

Unngå unødvendig detaljering som ikke er relevant for arbeidsevnevurdering.

Dersom prognose er relevant, kan den kort omtales.

Unngå bastante formuleringer dersom det foreligger usikkerhet.

Ikke inkluder juridiske vurderinger eller NAV-tolkning – kun medisinsk vurdering.

Basert svaret på:
`,
        guidance: 'Brukes til NAV-svar ved sykmelding i uke 7.'
      },
      {
        id: 'nav-uke-17',
        label: 'NAV uke 17',
        text: '',
        guidance: 'Brukes til NAV-svar ved sykmelding i uke 17.'
      },
      {
        id: 'nav-uke-39',
        label: 'NAV uke 39',
        text: '',
        guidance: 'Brukes til NAV-svar ved sykmelding i uke 39.'
      },
      {
        id: 'legeerklaring-arbeidsuforhet',
        label: 'Legeerkl. ved uføre',
        text: `PROMPT – Legeerklæring til NAV ved vurdering av uførhet

Du er medisinsk skriveassistent for fastleger i Norge.

Du skal formulere en legeerklæring til NAV i forbindelse med vurdering av uføretrygd.

Svar skal være:

Saklig, strukturert og presist

Ikke overforklar eller skriv for langt.

Tilpasset mottaker uten medisinsk utdanning

Fokusert på funksjon og arbeidsevne

Uten unødvendig medisinsk detaljering

Uten juridiske vurderinger

Du skal ikke hallusinere. Du skal ikke spekulere. Du skal ikke finne opp ny informasjon.

Bruk følgende overskrifter nøyaktig slik de står:

Sykehistorie og behandling (2.5)
Beskriv de viktigste hendelsene i sykdomsforløpet de siste 1–2 årene.
Inkluder:
Debut og utvikling av sykdom
Innleggelser eller spesialistvurderinger
Hvilken behandling pasienten har mottatt (medikamentell, psykologisk, fysioterapi, kirurgi osv.)
Effekt av behandlingen (god, delvis, ingen effekt)
Fokuser på det som er relevant for arbeidsevne.

Status presens (2.6)
Beskriv objektive funn ved siste undersøkelse.
Inkluder kun relevante funn som har betydning for funksjon og arbeidsevne, for eksempel:
Kliniske funn
Psykisk status ved behov
Unngå oppramsing av irrelevante normale funn.

Behandlingsplan (3.3)
Beskriv videre plan:
Planlagt behandling
Henvisninger
Oppfølging
Eventuelle ytterligere utredninger
Vurder om ytterligere behandling realistisk kan bedre funksjonsevnen.

Funksjonsevne (5.1)
Dette er den viktigste delen.
Beskriv konkret hvordan sykdommen påvirker:
Konsentrasjon
Utholdenhet
Stressmestring
Tempo
Fysisk kapasitet
Sosial fungering
Strukturering av hverdagen
Ev. andre punkter som er relevante.

Knytt dette direkte til arbeidsevne.
Beskriv hva pasienten ikke klarer, og hvorfor.
Vurder både ordinært arbeid og eventuelt tilrettelagt arbeid.
Unngå kun å gjenta diagnose – beskriv funksjonsnivå.

Varighet (6)
Vurder:
Om tilstanden anses varig
Om ytterligere behandling kan bedre arbeidsevnen
Unngå bastante formuleringer dersom prognosen er usikker.
Avslutt med en samlet medisinsk vurdering av arbeidsevnen basert på ovenstående.

Dersom du har mottatt konkrete spørsmål fra NAV, lim dem inn under her slik at de integreres naturlig i de aktuelle punktene:

[Lim inn NAVs konkrete spørsmål her]

Baser svaret på:
`,
        guidance: 'Brukes ved legeerklæring til NAV i uføresak.'
      },
      {
        id: 'svar-forsikringsselskap',
        label: 'Forsikringsarbeid',
        text: '',
        guidance: 'Brukes for medisinske svar til forsikringsselskap basert på journalgrunnlag.'
      }
    ]
  }
];

export default function ChatGPTPrompt() {
  const [userInput, setUserInput] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState(promptCategories[0].templates[0].id);
  const [systemPrompt, setSystemPrompt] = useState(promptCategories[0].templates[0].text);
  const [copyState, setCopyState] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const handleRun = async () => {
    if (!userInput.trim()) {
      setCopyState('⚠️ Skriv inn tekst først');
      setTimeout(() => setCopyState(''), 2000);
      return;
    }

    const combinedText = systemPrompt + userInput;

    try {
      await navigator.clipboard.writeText(combinedText);
      setCopyState('✓ Kopiert! Åpner KI-assistent...');
      
      // Open KI-assistent in new tab
      window.open('https://chatgpt.com/', '_blank');
      
      setTimeout(() => setCopyState(''), 3000);
    } catch (error) {
      setCopyState('❌ Kunne ikke kopiere');
      setTimeout(() => setCopyState(''), 2000);
    }
  };

  const handleCopyOnly = async () => {
    const combinedText = systemPrompt + userInput;
    try {
      await navigator.clipboard.writeText(combinedText);
      setCopyState('✓ Kopiert til clipboard!');
      setTimeout(() => setCopyState(''), 2000);
    } catch (error) {
      setCopyState('❌ Kunne ikke kopiere');
      setTimeout(() => setCopyState(''), 2000);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    let template = null;
    for (const category of promptCategories) {
      template = category.templates.find(t => t.id === templateId);
      if (template) break;
    }
    if (!template) return;
    setActiveTemplateId(template.id);
    setSystemPrompt(template.text);
  };

    let activeTemplate = null;
    for (const category of promptCategories) {
      activeTemplate = category.templates.find(t => t.id === activeTemplateId);
      if (activeTemplate) break;
    }
    if (!activeTemplate) activeTemplate = promptCategories[0].templates[0];

  const testPhaseTemplateIds = ['melding-til-pasient', 'psykiatrisk-henvisning', 'symptomsok'];
  const isEConsult = activeTemplate.id === 'e-konsultasjon-assistent';
  const userInputLabel = 'Lim inn relevant tekst';
  const fremgangsmateByTemplate: Record<string, string> = {
    'symptomsok': `- Lim inn symptomer, varighet og kliniske funn
  - Oppgi alder, kjønn og relevante komorbiditeter hvis kjent
  - Beskriv hva du ønsker hjelp til (f.eks. differensialdiagnoser eller videre utredning)`,
    'medisinsk-assistent': `- Kan brukes på ulike måter:
  - Skriv et spørsmål du ønsker svar på fra en norsk kilde
  - Lim inn pasientkasuistikk om du ønsker en vurdering`,
    'e-konsultasjon-assistent': `- Lim inn pasientens melding
  - Du kan også legge ved relevant informasjon eller en kort kommentar om hva du tenker`,
    'oppsummering-av-case': `- Lim inn journalnotater, epikriser, bildebeskrivelser eller annen relevant informasjon du ønsker laget en oppsummering av
  - Inkluder gjerne datoer eller gjør det kronologisk, men du må ikke`,
    '2-cd-notat': '- Lim inn transkripsjon eller journalnotat',
    '615-notat': `- Lim inn transkripsjon eller journalnotat
  - Skriv gjerne diagnosen, f.eks. "depresjon"`,
    'lmg-assistent': `- Lim inn legemiddelliste
  - Fullfør notatet manuelt`,
    'radiologisvar-til-pasient': `- Lim inn radiologisvar
  - Inkluder gjerne journalnotat om bakgrunn for at bildet ble rekvirert`,
    'melding-til-pasient': '- Usikker',
    'henvisning-til-rehabilitering': `- Lim inn dekkende journalnotater (henvisningen blir ikke bedre enn det du legger ved)
  - Skriv eller sørg for at det som er forsøkt i primærhelsetjeneste og lokal helsetjeneste er nevnt
  - Skriv kort om hva man ønsker å oppnå med oppholdet`,
    'generisk-henvisning': `- Lim inn journalnotat med relevant informasjon
  - Oppgi hvilken avdeling eller diagnose pasienten henvises for`,
    'psykiatrisk-henvisning': `- Lim inn journalnotat med relevant informasjon
  - Inkluder gjerne informasjon om psykisk status presens og funksjonsnivå`,
    'nav-uke-7': `- Lim inn journalnotat
  - Viktigst med tiltak forsøk og funksjonsnivå`,
    'nav-uke-17': `- Lim inn journalnotat
  - Viktigst med tiltak forsøk og funksjonsnivå`,
    'nav-uke-39': `- Lim inn journalnotat
  - Viktigst med tiltak forsøk og funksjonsnivå`,
    'legeerklaring-arbeidsuforhet': '- Lim inn journalnotat med sykehistorie, behandling/tiltak forsøkt og funksjonsvurdering.',
    'svar-forsikringsselskap': `- Lim inn spørsmål fra selskapet
  - Lim inn journalgrunnlag`
    };
  const formålText = activeTemplate.guidance || 'Formål kommer her.';
  const fremgangsmåteText =
    fremgangsmateByTemplate[activeTemplate.id] ||
    'Fremgangsmåte kommer her.';
  const formålOgFremgangsmåteText = `Formål:\n${formålText}\n\nFremgangsmåte:\n${fremgangsmåteText}`;
  const userInputPlaceholder = isEConsult
    ? 'Lim inn henvendelsen fra pasienten her. Skriv en kort beskjed om du ønsker for å få et mer presist notat, men det er ikke nødvendig.'
    : 'Lim inn relevante journalnotater, radiologisvar eller annet relevant her. Kom med korte føringer om du ønsker.';

  return (
    <div style={{ marginTop: 20 }} className="form-section">
      <div
        style={{
          marginBottom: 16,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #dbeafe',
          background: '#eff6ff',
          color: '#1e3a8a',
          fontSize: 13,
          lineHeight: 1.5
        }}
      >
        <strong>Slik bruker du KI-assistenten:</strong>
        <br />
        1. Velg ønsket mal.
        <br />
        2. Lim inn relevant tekst.
        <br />
        3. Klikk «Kjør med KI-assistent».
        <br />
        Teksten kopieres automatisk. KI-assistenten åpnes i en ny fane – <strong>lim inn teksten med Ctrl+V.</strong>
      </div>

      {/* System Prompt Section */}
      <div style={{ marginBottom: 20 }}>
          {promptCategories.map((category) => (
            <div key={category.id} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1f2937' }}>
                {category.label}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {category.templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateChange(template.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      background:
                        testPhaseTemplateIds.includes(template.id)
                          ? (activeTemplateId === template.id ? '#dc2626' : '#fee2e2')
                          : (activeTemplateId === template.id ? '#0891b2' : '#e5e7eb'),
                      color:
                        testPhaseTemplateIds.includes(template.id)
                          ? '#7f1d1d'
                          : (activeTemplateId === template.id ? 'white' : '#1f2937'),
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Formål og fremgangsmåte:
          </label>
          <button
            type="button"
            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: isEditingPrompt ? '#0891b2' : '#e5e7eb',
              color: isEditingPrompt ? 'white' : '#1f2937',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isEditingPrompt ? '✓ Ferdig' : '✏️ Rediger prompt'}
          </button>
        </div>
        
        {isEditingPrompt ? (
          <textarea
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              setActiveTemplateId('');
            }}
            placeholder="Skriv ditt faste prompt her..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              fontSize: 14,
              borderRadius: 6,
              border: '2px solid #0891b2',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        ) : (
          <div
            style={{
              padding: 12,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 14,
              whiteSpace: 'pre-wrap',
              color: '#6b7280'
            }}
          >
            {formålOgFremgangsmåteText}
          </div>
        )}
      </div>

      {/* User Input Section */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
          {userInputLabel}
        </label>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={userInputPlaceholder}
          style={{
            width: '100%',
            minHeight: 200,
            padding: 12,
            fontSize: 14,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleRun}
          style={{
            padding: '12px 24px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#10b981')}
        >
          🚀 Kjør (Kopier + Åpne KI-assistent)
        </button>

        <button
          type="button"
          onClick={handleCopyOnly}
          style={{
            padding: '12px 24px',
            background: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#0e7490')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0891b2')}
        >
          📋 Kun kopier tekst
        </button>

        <button
          type="button"
          onClick={() => setUserInput('')}
          style={{
            padding: '12px 24px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
        >
          🗑️ Tøm
        </button>

        {copyState && (
          <span
            style={{
              padding: '8px 16px',
              background: copyState.includes('✓') ? '#d1fae5' : '#fee2e2',
              color: copyState.includes('✓') ? '#065f46' : '#991b1b',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {copyState}
          </span>
        )}
      </div>
    </div>
  );
}
