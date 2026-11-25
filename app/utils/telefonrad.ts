/**
 * Telefonråd for helsesekretær ved fastlegekontor.
 *
 * Innholdet er et faglig utgangspunkt og skal godkjennes av ansvarlig lege
 * og tilpasses kontorets egne prosedyrer før bruk. Råd fra helsesekretær
 * forutsetter delegasjon fra lege eller at legen er konferert.
 *
 * Takstreglene bygger på Legeforeningens kommentarutgave til
 * normaltariffen 2025–2026 (takst 1ad/1bd): medhjelper utløser taksten når
 * hun gir konkrete, journalverdige medisinske råd etter legens delegasjon
 * eller etter å ha konferert med legen, eller formidler legens beskjed.
 * Timebestilling og enkel beskjed om prøvesvar uten råd gir ingen takst.
 */

export interface Telefonrad {
  id: string;
  title: string;
  category: TelefonradCategory;
  keywords: string[];
  /** Ring 113 / send akutt. */
  akutt: string[];
  /** Pasienten skal snakke med lege eller få time samme dag. */
  sammeDag: string[];
  /** Råd som kan gis etter kontorets prosedyre. */
  rad: string[];
  /** Når pasienten skal ta ny kontakt. */
  nyKontakt: string[];
  /** Foreslått takst, eller null når helsesekretær ikke skal ta takst. */
  takst: string | null;
  takstMerknad: string;
  /** Mal for journalnotat. Fyll inn [hakeparentesene]. */
  taksttekst: string;
}

export type TelefonradCategory = "Barn" | "Infeksjon" | "Akutt" | "Muskel og skjelett" | "Administrativt";

export const TELEFONRAD_CATEGORIES: TelefonradCategory[] = [
  "Akutt",
  "Barn",
  "Infeksjon",
  "Muskel og skjelett",
  "Administrativt",
];

const TAKST_RAD = "Råd gitt etter legens delegasjon (prosedyre) eller etter å ha konferert med lege.";

export const TELEFONRAD: Telefonrad[] = [
  {
    id: "brystsmerter",
    title: "Brystsmerter",
    category: "Akutt",
    keywords: ["hjerte", "infarkt", "trykk", "bryst", "tungpust", "angina"],
    akutt: [
      "Brystsmerter eller trykk i brystet som varer mer enn noen minutter",
      "Smerter som stråler til arm, kjeve, rygg eller mage",
      "Samtidig tungpust, kaldsvette, kvalme, svimmelhet eller besvimelse",
    ],
    sammeDag: [
      "Kortvarige stikk som ikke er der nå, og pasienten er ellers i form: sett over til lege straks",
    ],
    rad: [
      "Ved akutte brystsmerter: be pasienten legge på og ringe 113 med en gang, eller ring 113 for pasienten",
      "Ikke gi råd om å vente og se, og ikke sett opp time frem i tid",
      "Varsle lege på kontoret med en gang",
    ],
    nyKontakt: ["Ikke aktuelt. Alltid lege samme dag eller 113."],
    takst: null,
    takstMerknad: "Akuttsituasjon. Ingen takst for helsesekretær. Legen tar takst hvis legen overtar samtalen.",
    taksttekst:
      "Tlf. fra [pasient/pårørende]. Brystsmerter siden [tid], [beskrivelse]. Bedt om å ringe 113 / 113 varslet kl. [tid]. Lege [navn] informert kl. [tid].",
  },
  {
    id: "allergisk-reaksjon",
    title: "Allergisk reaksjon og insektstikk",
    category: "Akutt",
    keywords: ["anafylaksi", "veps", "bie", "elveblest", "utslett", "hevelse", "epipen", "adrenalin"],
    akutt: [
      "Hevelse i lepper, tunge eller svelg, heshet eller vansker med å svelge",
      "Pustebesvær eller pipelyder",
      "Svimmelhet, besvimelse eller blek og klam hud",
      "Utbredt elveblest og pasienten føler seg dårlig",
    ],
    sammeDag: [
      "Lokal hevelse som øker etter 1 til 2 døgn, med rødhet, varme eller feber (mulig infeksjon)",
      "Stikk i munn eller svelg selv om pasienten er i form nå",
    ],
    rad: [
      "Ved tegn på alvorlig reaksjon: ring 113. Har pasienten adrenalinpenn, skal den brukes med en gang",
      "Lokal reaksjon: kjøl ned med kald klut, hold området i ro",
      "Reseptfritt antihistamin og 1 % hydrokortisonkrem kan lindre kløe, bruk etter pakningsvedlegget",
      "Fjern brodd fra bie ved å skrape den ut",
    ],
    nyKontakt: ["Økende hevelse, rødhet eller feber de neste dagene"],
    takst: "1bd",
    takstMerknad: TAKST_RAD + " Ved akutt reaksjon: ingen takst for helsesekretær.",
    taksttekst:
      "Tlf. fra [pasient]. [Stikk/reaksjon] for [tid] siden. Lokal hevelse [størrelse], ingen pustebesvær, ingen hevelse i munn eller svelg, ikke allmennpåvirket. Råd etter prosedyre: kjøling, reseptfritt antihistamin etter pakningsvedlegg. Ny kontakt ved økende hevelse eller feber, 113 ved pustebesvær. Takst 1bd.",
  },
  {
    id: "feber-barn",
    title: "Feber hos barn",
    category: "Barn",
    keywords: ["feber", "temperatur", "småbarn", "paracetamol", "kramper"],
    akutt: [
      "Barnet er slapt, vanskelig å vekke eller ikke får kontakt",
      "Pustebesvær, inndragninger eller grå eller blålig hudfarge",
      "Utslett med små blødninger som ikke blekner når man trykker et glass mot huden",
      "Krampe som varer mer enn 5 minutter",
    ],
    sammeDag: [
      "Barn under 3 måneder med temperatur 38,0 eller mer: lege straks (legevakt hvis kontoret ikke kan ta imot nå)",
      "Drikker lite, tisser lite eller har tørr munn",
      "Første gang feberkramper",
      "Øresmerter, tung pust eller nakkestivhet",
      "Foreldrene er bekymret selv om de ikke kan si hvorfor",
    ],
    rad: [
      "Feber er kroppens forsvar og er ikke farlig i seg selv. Se mest på hvordan barnet har det",
      "Tilby drikke ofte, gjerne litt om gangen",
      "Lett påkledning og normal romtemperatur",
      "Febernedsettende (paracetamol) ved ubehag, dose etter vekt i pakningsvedlegget",
    ],
    nyKontakt: ["Barnet blir dårligere", "Feber i mer enn 3 døgn", "Nye symptomer som pustebesvær, utslett eller øresmerter"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [mor/far]. [Navn], [alder], feber [temp] i [antall] døgn. Våken og kontaktbar, drikker og tisser. Ingen pustebesvær, ingen utslett. Råd etter prosedyre: drikke, lett påkledning, paracetamol etter vekt ved ubehag. Ny kontakt ved forverring eller feber over 3 døgn, 113 ved faresignaler. Takst 1bd.",
  },
  {
    id: "oppkast-diare",
    title: "Oppkast og diaré",
    category: "Barn",
    keywords: ["omgangssyke", "magesyke", "uttørking", "dehydrering", "gastroenteritt", "norovirus"],
    akutt: [
      "Svært slapp, vanskelig å vekke eller forvirret",
      "Kraftige, tiltagende magesmerter",
    ],
    sammeDag: [
      "Tegn på uttørking: tisser lite, tørr munn, ingen tårer, innsunkne øyne, slapp",
      "Spedbarn under 6 måneder med oppkast eller diaré",
      "Grønt oppkast eller blod i avføringen",
      "Klarer ikke å beholde væske i flere timer",
      "Diabetes, nyresykdom eller bruk av vanndrivende eller blodtrykksmedisin",
    ],
    rad: [
      "Små slurker ofte, for eksempel en spiseskje hvert par minutter",
      "Rehydreringsvæske fra apoteket er best ved mye væsketap",
      "Fortsett amming. Vanlig mat når lysten kommer",
      "God håndvask. Hjemme fra barnehage, skole og jobb til 48 timer uten symptomer",
    ],
    nyKontakt: ["Tegn på uttørking", "Diaré i mer enn 7 dager", "Høy feber eller blod i avføringen"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient/pårørende]. Oppkast/diaré i [antall] døgn. Drikker og beholder væske, tisser, ikke slapp. Ikke blod i avføringen. Råd etter prosedyre: små slurker ofte, rehydreringsvæske, håndhygiene, hjemme til 48 t symptomfri. Ny kontakt ved tegn på uttørking. Takst 1bd.",
  },
  {
    id: "urinveisinfeksjon",
    title: "Urinveisinfeksjon hos kvinne",
    category: "Infeksjon",
    keywords: ["uvi", "blærekatarr", "svie", "cystitt", "urinprøve", "tisse"],
    akutt: ["Forvirret, svært dårlig eller tegn på blodforgiftning (frysninger, rask pust, kald og klam)"],
    sammeDag: [
      "Feber, frysninger eller smerter i siden eller ryggen (mulig nyrebekkenbetennelse)",
      "Gravid",
      "Mann eller barn med urinveissymptomer",
      "Kateter, diabetes, nedsatt immunforsvar eller nyresykdom",
      "Blod i urinen uten andre plager",
    ],
    rad: [
      "Gjelder frisk, ikke gravid kvinne med svie og hyppig vannlating uten feber",
      "Lever midtstråleurin på kontoret etter kontorets prosedyre. Legen vurderer prøven og eventuell behandling",
      "Drikk jevnt gjennom dagen",
      "Plagene går ofte over av seg selv i løpet av noen dager",
    ],
    nyKontakt: ["Feber eller smerter i siden", "Ingen bedring etter 2 til 3 dager", "Plagene kommer tilbake kort tid etter behandling"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient]. Svie og hyppig vannlating i [antall] døgn. Ikke feber, ikke smerter i siden, ikke gravid. Leverer urinprøve [dato]. Lege vurderer. Ny kontakt ved feber eller flankesmerter. Takst 1bd.",
  },
  {
    id: "sar-hals",
    title: "Sår hals",
    category: "Infeksjon",
    keywords: ["halsbetennelse", "tonsillitt", "streptokokker", "svelgsmerter", "halsvondt"],
    akutt: ["Pustebesvær eller klarer ikke å svelge spyttet (sikler)"],
    sammeDag: [
      "Kraftige smerter på én side, vansker med å gape eller grøtete stemme (mulig abscess)",
      "Høy feber og tydelig dårlig allmenntilstand",
    ],
    rad: [
      "De fleste halsbetennelser skyldes virus og går over av seg selv i løpet av en uke",
      "Smertestillende etter pakningsvedlegget, slik at det går an å spise og drikke",
      "Drikk godt, kald eller lunken drikke lindrer ofte",
    ],
    nyKontakt: ["Ingen bedring etter en uke", "Blir dårligere eller får vansker med å svelge"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient]. Sår hals i [antall] døgn, [temp]. Svelger, ingen pustebesvær, gaper normalt. Råd etter prosedyre: smertestillende og drikke. Ny kontakt ved forverring eller over en uke. Takst 1bd.",
  },
  {
    id: "forkjolelse-hoste",
    title: "Forkjølelse og hoste",
    category: "Infeksjon",
    keywords: ["luftveisinfeksjon", "snørr", "tett nese", "influensa", "covid", "bihuler"],
    akutt: ["Alvorlig pustebesvær, blå lepper eller klarer ikke å snakke hele setninger"],
    sammeDag: [
      "Tung eller rask pust",
      "Smerter i brystet når pasienten puster",
      "Høy feber i mer enn 3 døgn, eller ny feber etter at det har gått bedre",
      "Spedbarn som puster tungt eller ikke orker å spise",
    ],
    rad: [
      "Hvile og drikke godt",
      "Saltvann i nesen lindrer tett nese, også for små barn",
      "Hoste kan vare i 3 til 4 uker etter en forkjølelse",
      "Antibiotika hjelper ikke mot forkjølelse",
    ],
    nyKontakt: ["Hoste i mer enn 4 uker", "Blod i oppspyttet", "Pustebesvær eller høy feber over flere dager"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient]. Forkjølelse/hoste i [antall] dager, [temp]. Ingen pustebesvær, ingen brystsmerter. Råd etter prosedyre: hvile, drikke, saltvann i nesen. Ny kontakt ved tung pust, høy feber over 3 døgn eller hoste over 4 uker. Takst 1bd.",
  },
  {
    id: "rodt-oye",
    title: "Rødt øye og øyekatarr",
    category: "Infeksjon",
    keywords: ["konjunktivitt", "øye", "puss", "klistrete", "fremmedlegeme", "etseskade"],
    akutt: [
      "Kjemikalier eller etsende væske i øyet: skyll straks med rennende vann i minst 15 minutter, deretter legevakt",
    ],
    sammeDag: [
      "Nedsatt syn",
      "Sterke smerter eller lysskyhet",
      "Fremmedlegeme eller slag mot øyet",
      "Kontaktlinsebruker med smerter",
      "Nyfødt med pussende øye",
    ],
    rad: [
      "Øyekatarr med rusk og klistrete øyne går som regel over av seg selv i løpet av en uke",
      "Rens øyet med lunkent vann, fra innerst til ytterst",
      "God håndvask og eget håndkle",
      "Barn med øyekatarr trenger som regel ikke være hjemme fra barnehagen",
    ],
    nyKontakt: ["Ingen bedring etter en uke", "Smerter, nedsatt syn eller lysskyhet"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient/pårørende]. Rødt, klistrete [høyre/venstre/begge] øye i [antall] dager. Ser normalt, ingen sterke smerter, ikke lysskyhet. Råd etter prosedyre: rens med lunkent vann, håndhygiene. Ny kontakt ved forverring eller over en uke. Takst 1bd.",
  },
  {
    id: "flattbitt",
    title: "Flåttbitt",
    category: "Infeksjon",
    keywords: ["flått", "borrelia", "erythema migrans", "rød ring", "tbe"],
    akutt: [],
    sammeDag: [
      "Ansiktslammelse, sterk hodepine eller nakkestivhet i ukene etter bitt",
      "Feber og påvirket allmenntilstand etter flåttbitt",
    ],
    rad: [
      "Fjern flåtten så raskt som mulig med pinsett eller flåttfjerner, tett inntil huden",
      "Vask området etterpå. Det gjør ikke noe om litt av hodet blir sittende igjen",
      "Ingen behov for time eller antibiotika hvis pasienten ikke har symptomer",
      "Følg med på bittstedet i 4 uker",
    ],
    nyKontakt: [
      "Rød ring eller rødt område på 5 cm eller mer som vokser utover, dager til uker etter bittet: bestill vanlig time",
    ],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient]. Flåttbitt [sted], [dato]. Flått fjernet. Ingen symptomer. Råd etter prosedyre: følg med bittsted i 4 uker. Ny kontakt ved voksende rødme over 5 cm, ansiktslammelse eller feber. Takst 1bd.",
  },
  {
    id: "akutte-ryggsmerter",
    title: "Akutte ryggsmerter",
    category: "Muskel og skjelett",
    keywords: ["lumbago", "hekseskudd", "isjias", "korsrygg", "rygg", "prolaps"],
    akutt: [
      "Nedsatt følelse i seteregion eller underliv, problemer med å late vannet eller holde på avføringen (lege straks)",
      "Tiltagende lammelse i ett eller begge ben (lege straks)",
    ],
    sammeDag: [
      "Feber sammen med ryggsmertene",
      "Kjent kreftsykdom",
      "Etter fall eller skade, særlig hos eldre eller ved benskjørhet",
      "Sterke smerter også i hvile og om natten",
    ],
    rad: [
      "De fleste ryggsmerter er ufarlige og blir bedre i løpet av noen dager til et par uker",
      "Hold deg i bevegelse så godt det går. Unngå sengeleie",
      "Varme kan lindre",
      "Reseptfrie smertestillende etter pakningsvedlegget, slik at det går an å bevege seg",
    ],
    nyKontakt: ["Ikke bedring etter 2 uker", "Smerter som stråler ned i benet og blir verre", "Nye symptomer"],
    takst: "1bd",
    takstMerknad: TAKST_RAD,
    taksttekst:
      "Tlf. fra [pasient]. Akutte smerter i korsryggen siden [tid], [utstråling]. Ingen nummenhet i underliv, normal vannlating og avføring, ingen lammelser, ikke feber. Råd etter prosedyre: aktivitet, varme, reseptfrie smertestillende. Ny kontakt ved manglende bedring etter 2 uker. Straks kontakt ved nummenhet i underliv eller lammelser. Takst 1bd.",
  },
  {
    id: "provesvar",
    title: "Prøvesvar",
    category: "Administrativt",
    keywords: ["blodprøve", "svar", "lab", "resultat", "normalt"],
    akutt: [],
    sammeDag: ["Legen har merket svaret som haster"],
    rad: [
      "Gi bare svar som legen har vurdert og gitt beskjed om",
      "Formidle legens beskjed ordrett, for eksempel om nye prøver, endret dose eller ny time",
      "Spørsmål som går ut over legens beskjed: sett på liste til legen eller sett opp time",
    ],
    nyKontakt: ["Etter legens beskjed"],
    takst: "1bd",
    takstMerknad:
      "1bd når helsesekretær formidler legens beskjed eller konfererer med legen under samtalen. Bare beskjed om at svaret er kommet eller er normalt, uten råd: ingen takst.",
    taksttekst:
      "Tlf. med [pasient]. Formidlet legens beskjed om prøvesvar fra [dato]: [beskjed fra lege]. Takst 1bd.",
  },
  {
    id: "resept-fornyelse",
    title: "Fornyelse av resept",
    category: "Administrativt",
    keywords: ["resept", "e-resept", "medisin", "fornye", "apotek"],
    akutt: [],
    sammeDag: ["Pasienten går tom for viktig medisin (for eksempel insulin, epilepsi- eller hjertemedisin) i dag eller i morgen"],
    rad: [
      "Noter legemiddel, styrke og dosering slik pasienten bruker det",
      "Legg forespørselen til legen. Det er legen som vurderer og skriver resepten",
      "Si når pasienten kan regne med at resepten er klar",
    ],
    nyKontakt: ["Hvis resepten ikke er klar til avtalt tid"],
    takst: null,
    takstMerknad:
      "Ingen takst for helsesekretær ved ren beskjed. Legen tar 1i for e-resept, eller 1bd hvis det samtidig gis råd.",
    taksttekst:
      "Tlf. fra [pasient]. Ønsker fornyet resept på [legemiddel, styrke, dosering]. Lagt til lege [navn] [dato].",
  },
  {
    id: "timebestilling",
    title: "Timebestilling",
    category: "Administrativt",
    keywords: ["time", "bestille", "avbestille", "flytte"],
    akutt: [],
    sammeDag: ["Bruk spørsmålene under de andre problemstillingene for å avgjøre hastegrad"],
    rad: [
      "Spør kort om hva det gjelder, slik at timen får riktig lengde og hastegrad",
      "Gi samme dag time ved faresignaler, se de andre problemstillingene",
    ],
    nyKontakt: [],
    takst: null,
    takstMerknad: "Timebestilling uten samtidig råd gir ikke takst.",
    taksttekst: "Tlf. fra [pasient]. Time bestilt [dato] hos [lege] for [problemstilling].",
  },
];
