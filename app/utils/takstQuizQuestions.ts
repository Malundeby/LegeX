// Spørsmålsbank for takst-quizen.
// Basert på kontorets interne takstliste for helsesekretærer.
// Utvid eller rediger listen fritt – rekkefølgen på svaralternativene
// avgjøres av `correct`-indeksen (0-basert), ikke av rekkefølgen i UI.

export interface QuizQuestion {
  /** Stabil id, brukes som React key og i resultatoversikten. */
  id: number;
  /** Pasientcaset som vises til brukeren. */
  case: string;
  /** De fire svaralternativene (takstkombinasjoner). */
  options: [string, string, string, string];
  /** Indeks (0–3) i `options` som er riktig svar. */
  correct: 0 | 1 | 2 | 3;
  /** Kort forklaring som vises etter svar. */
  explanation: string;
}

export const takstQuizQuestions: QuizQuestion[] = [
  {
    id: 1,
    case: "Pasient har kjøpt influensavaksine selv på apoteket og vil ha den satt.",
    options: ["250 kr", "250 kr + Vaksinepris (Div)", "1ad + 10a", "250 kr + 420 kr (Div)"],
    correct: 0,
    explanation: "Vax dekker kun settingen (250 kr) når pasienten har kjøpt vaksinen selv på apoteket.",
  },
  {
    id: 2,
    case: "Pasient skal ha en vaksine som tas fra kontorets eget lager (TL).",
    options: ["250 kr", "250 kr + Vaksinepris (Div)", "250 kr + 420 kr (Div)", "1ad + 10a"],
    correct: 1,
    explanation: "Når vaksinen kommer fra kontorets eget lager (TL), legges vaksineprisen til i tillegg til settetaksten på 250 kr.",
  },
  {
    id: 3,
    case: "Pasient har skåret seg dypt og trenger stivkrampeoppfriskning (Boostrix) fra kontorets lager.",
    options: ["250 kr + Vaksinepris (Div)", "250 kr + 420 kr (Div)", "250 kr", "1ad + 10a"],
    correct: 1,
    explanation: "Boostrix kjøpt på TL har fast tilleggstakst på 420 kr, i tillegg til settetaksten på 250 kr.",
  },
  {
    id: 4,
    case: "Pasient ringer og lurer på oppbevaring av medisiner på en varm reise; helsesekretær svarer over telefon.",
    options: ["1ad", "1bd", "1ad + 10a", "701a"],
    correct: 1,
    explanation: "Råd til pasient / pasientreiser uten prøve eller prosedyre gis takst 1bd.",
  },
  {
    id: 5,
    case: "Pasient skal ha satt en B12-injeksjon, uten samtidig legetime.",
    options: ["1ad + 10a", "1ad + 10b", "1bd", "701a + 708a"],
    correct: 0,
    explanation: "Injeksjoner gis takst 1ad + 10a.",
  },
  {
    id: 6,
    case: "Pasient skal ha fjernet sting etter en operasjon. Ingen legetime samme dag.",
    options: ["1ad + 10a", "1ad + 10b", "2ad + 10b", "1ad + 100 + 10c"],
    correct: 1,
    explanation: "Fjerning av suturer gis 1ad + 10b.",
  },
  {
    id: 7,
    case: "Pasient som ble sydd for en flenge i pannen for to uker siden, kommer for å få fjernet stingene. Ingen legetime.",
    options: ["1ad + 10b", "1ad + 10a", "1ad + 100 + 10c", "2ad + 10b"],
    correct: 0,
    explanation: "Samme regel gjelder for all suturfjerning: 1ad + 10b, uansett hvor på kroppen skaden satt.",
  },
  {
    id: 8,
    case: "Pasient skal ha fjernet agraffer (stifter) etter kirurgi. Ingen legetime samme dag.",
    options: ["1ad + 10b", "1ad + 10a", "1ad + 100 + 10d", "2ad + 10b"],
    correct: 0,
    explanation: "Fjerning av agraffer regnes som fjerning av suturer: 1ad + 10b.",
  },
  {
    id: 9,
    case: "Lite overfladisk sår renses og stelles, uten at legen ser på såret.",
    options: ["1ad + 100 + 10c", "1ad + 100 + 10d", "1ad + 105 + 10d", "2ad + 100 + 10c"],
    correct: 0,
    explanation: "Små sår gis 1ad + 100 + 10c når legen ikke tilser såret.",
  },
  {
    id: 10,
    case: "Lite overfladisk sår undersøkes av legen selv før det stelles.",
    options: ["1ad + 100 + 10c", "2ad + 100 + 10c", "2ad + 100 + 10d", "1ad + 105 + 10c"],
    correct: 1,
    explanation: "Tilses såret av lege, skal 2ad benyttes i stedet for 1ad: 2ad + 100 + 10c.",
  },
  {
    id: 11,
    case: "Stort, komplisert sår renses og dekkes til, uten at legen tilser såret.",
    options: ["1ad + 100 + 10c", "1ad + 100 + 10d", "2ad + 100 + 10d", "1ad + 105 + 10d"],
    correct: 1,
    explanation: "Store sår gis 1ad + 100 + 10d.",
  },
  {
    id: 12,
    case: "Stort sår undersøkes av legen før stell.",
    options: ["1ad + 100 + 10d", "2ad + 100 + 10d", "2ad + 105 + 10d", "2ad + 100 + 10c"],
    correct: 1,
    explanation: "Tilses et stort sår av legen, brukes 2ad + 100 + 10d.",
  },
  {
    id: 13,
    case: "Diabetiker med kronisk leggsår stelles regelmessig, uten at legen tilser såret denne gangen.",
    options: ["1ad + 100 + 10d", "1ad + 105 + 10d", "2ad + 105 + 10d", "1ad + 105 + 10c"],
    correct: 1,
    explanation: "Kroniske sår (legg-, fot- og trykksår, inkl. diabetiske) gis 1ad + 105 + 10d.",
  },
  {
    id: 14,
    case: "Pasient med kronisk trykksår får såret vurdert av legen samme dag som det stelles.",
    options: ["1ad + 105 + 10d", "2ad + 105 + 10d", "2ad + 100 + 10d", "1ad + 105 + 10c"],
    correct: 1,
    explanation: "Blir det kroniske såret tilsett av legen, brukes 2ad + 105 + 10d.",
  },
  {
    id: 15,
    case: "Pasient skal ha skylt ett øre for ørevoks, uten samtidig legetime.",
    options: ["1ad + 100 + 10b", "1ad + 10a", "1ad + 100 + 10c", "1ad + 322 + 10b"],
    correct: 0,
    explanation: "Øreskylling gis 1ad + 100 per øre + 10b når pasienten ikke har samtidig legetime.",
  },
  {
    id: 16,
    case: "Pasient skal ha skylt ett øre for ørevoks, og har legetime rett etterpå samme dag.",
    options: ["1ad + 100 + 10b", "100 + 10b", "1ad + 100 + 10c", "100 + 10c"],
    correct: 1,
    explanation: "Har pasienten samtidig legetime, faller 1ad bort: kun 100 + 10b.",
  },
  {
    id: 17,
    case: "Pasient skal ha på seg 24-timers blodtrykksmåler, uten samtidig legetime.",
    options: ["1ad + 106 + 10b", "106 + 10b", "1ad + 322 + 10b", "1ad + 121a + 10c"],
    correct: 0,
    explanation: "24t BT gis 1ad + 106 + 10b når pasienten ikke har samtidig legetime.",
  },
  {
    id: 18,
    case: "Gravid pasient skal gjennomføre en glukosebelastningstest.",
    options: ["701a + 708a", "1ad + 121a + 10c", "701a + 709", "1ad + 106 + 10b"],
    correct: 1,
    explanation: "Glukosebelastning i svangerskap gis 1ad + 121a + 10c.",
  },
  {
    id: 19,
    case: "Pasient skal ta en hørselstest (audiometri), uten samtidig legetime.",
    options: ["1ad + 322 + 10b", "322 + 10b", "1ad + 507c + 10b", "1ad + 106 + 10b"],
    correct: 0,
    explanation: "Audiometri gis 1ad + 322 + 10b uten samtidig legetime.",
  },
  {
    id: 20,
    case: "Pasient skal ta en hørselstest (audiometri), og har legetime samme dag.",
    options: ["1ad + 322 + 10b", "322 + 10b", "322 + 10c", "1ad + 322 + 10c"],
    correct: 1,
    explanation: "Med samtidig legetime faller 1ad bort: kun 322 + 10b.",
  },
  {
    id: 21,
    case: "Pasient skal ta spirometri uten reversibilitetstest, uten samtidig legetime.",
    options: ["1ad + 507c + 10b", "507c + 10b", "1ad + 507c + 507d + 10b", "1ad + 322 + 10b"],
    correct: 0,
    explanation: "Spirometri uten reversibilitet gis 1ad + 507c + 10b uten samtidig legetime.",
  },
  {
    id: 22,
    case: "Pasient skal ta spirometri uten reversibilitetstest, og har legetime samme dag.",
    options: ["1ad + 507c + 10b", "507c + 10b", "507c + 507d + 10b", "1ad + 507c + 507d + 10b"],
    correct: 1,
    explanation: "Med samtidig legetime: kun 507c + 10b.",
  },
  {
    id: 23,
    case: "Pasient skal ta spirometri med reversibilitetstest i samme seanse, uten egen legetime denne dagen.",
    options: ["1ad + 507c + 10b", "1ad + 507c + 507d + 10b", "507c + 507d + 10b", "1ad + 322 + 10b"],
    correct: 1,
    explanation: "Med reversibilitetstest og uten samtidig legetime: 1ad + 507c + 507d + 10b.",
  },
  {
    id: 24,
    case: "Pasient skal ta spirometri med reversibilitetstest, og har legetime samme dag.",
    options: ["1ad + 507c + 507d + 10b", "507c + 507d + 10b", "507c + 10b", "1ad + 507c + 10b"],
    correct: 1,
    explanation: "Med samtidig legetime faller 1ad bort: 507c + 507d + 10b.",
  },
  {
    id: 25,
    case: "Pasient skal ta et EKG, uten samtidig legetime.",
    options: ["1ad + 707 + 10b", "707 + 10b", "1ad + 106 + 10b", "701a + 706k"],
    correct: 0,
    explanation: "EKG gis 1ad + 707 + 10b uten samtidig legetime.",
  },
  {
    id: 26,
    case: "Pasient skal ta et EKG, og har legetime rett etterpå samme dag.",
    options: ["1ad + 707 + 10b", "707 + 10b", "2ad + 707 + 10b", "701a + 707"],
    correct: 1,
    explanation: "Med samtidig legetime faller 1ad bort: kun 707 + 10b.",
  },
  {
    id: 27,
    case: "Pasient skal følges til prøvetaking og få tatt en urinprøve i denne forbindelse (urinprøve med følge).",
    options: ["1ad + 618", "701a", "1ad + 701a", "701a + 618"],
    correct: 0,
    explanation: "Urinprøve med følge gis 1ad + 618.",
  },
  {
    id: 28,
    case: "Spesialist ved sykehuset ber om at en pasient får tatt blodprøver hos fastlegekontoret, uten konsultasjon hos kontorets egen lege.",
    options: ["701a", "1ad + 701a", "1ad + 10a", "701c"],
    correct: 1,
    explanation: "Prøvetaking for en ekstern rekvirent gis 1ad + 701a.",
  },
  {
    id: 29,
    case: "Kontoret skal sende en enkelt blodprøve til analyse ved et eksternt laboratorium.",
    options: ["701a", "701c", "1ad + 701a", "618"],
    correct: 0,
    explanation: "Sending av første prøve gis 701a.",
  },
  {
    id: 30,
    case: "Pasient kommer innom og lurer på om hun har urinveisinfeksjon. Hun har med seg en urinprøve til analyse.",
    options: ["701a", "1ad + 618", "701a + 705h", "701c"],
    correct: 0,
    explanation: "Urinstix for mistenkt UVI analyseres uten egen konsultasjon: 701a. Husk §4-merknaden i takstlisten.",
  },
  {
    id: 31,
    case: "Pasient leverer en urinprøve for stix-test ved mistenkt blærekatarr.",
    options: ["701a", "701a + 705h", "1ad + 618", "701c"],
    correct: 0,
    explanation: "Urinstix gis 701a, samme som ved mistenkt UVI.",
  },
  {
    id: 32,
    case: "Pasient skal få sendt både blodprøver og urinprøve samme dag. Blodprøvene er første forsendelse. Hva er tilleggstaksten for urinprøven?",
    options: ["701a", "701c", "618", "1ad + 701a"],
    correct: 1,
    explanation: "Sending utover den første prøven samme dag gis 701c.",
  },
  {
    id: 33,
    case: "Pasient har fått tatt en ekstra urinprøve i tillegg til blodprøvene samme dag, som andre forsendelse.",
    options: ["701a", "701c", "701a + 705h", "618"],
    correct: 1,
    explanation: "Andre og senere forsendelser samme dag gis 701c.",
  },
  {
    id: 34,
    case: "Pasient skal ta en avføringsprøve (Hemofec) som gjennomføres på kontoret.",
    options: ["701a + 704j", "701a + 705a", "701a + 706j", "701a + 705k"],
    correct: 0,
    explanation: "Hemofec på kontoret gis 701a + 704j.",
  },
  {
    id: 35,
    case: "Pasient leverer inn en Hemofec-hjemmetest tatt hjemme.",
    options: ["701a + 704j", "701a + 705a", "701a + 706j", "701a + 705h"],
    correct: 1,
    explanation: "Hemofec hjemmetest gis 701a + 705a.",
  },
  {
    id: 36,
    case: "Pasient skal ta en klamydiatest via urinprøve.",
    options: ["701a + 705k", "701a + 705h", "701a + 706h", "701a + 705a"],
    correct: 1,
    explanation: "Klamydiatest gis 701a + 705h. Husk §4-merknaden.",
  },
  {
    id: 37,
    case: "Pasient leverer en klamydia-selvtest til analyse.",
    options: ["701a + 705h", "701a + 705a", "701a + 706h", "701a + 705k"],
    correct: 0,
    explanation: "Klamydia (urin eller selvtest) gis samme takst: 701a + 705h.",
  },
  {
    id: 38,
    case: "Pasient med feber og mistenkt infeksjon skal ta en CRP-hurtigtest.",
    options: ["701a + 705k", "701a + 706k", "701a + 705h", "701a + 709"],
    correct: 0,
    explanation: "CRP gis 701a + 705k.",
  },
  {
    id: 39,
    case: "Pasient med vedvarende hoste skal ta en CRP-prøve for å vurdere infeksjon.",
    options: ["701a + 705k", "701a + 706L", "701a + 708a", "701a + 705h"],
    correct: 0,
    explanation: "CRP gis alltid 701a + 705k, uavhengig av symptombilde.",
  },
  {
    id: 40,
    case: "Pasient ønsker å ta en graviditetstest (HCG) på kontoret.",
    options: ["701a + 706h", "701a + 705h", "701a + 706j", "701a + 705k"],
    correct: 0,
    explanation: "HCG (graviditetstest) gis 701a + 706h.",
  },
  {
    id: 41,
    case: "Pasient skal ta en immunkjemisk avføringsprøve (iFOBT) som del av tarmscreening.",
    options: ["701a + 704j", "701a + 706j", "701a + 705a", "701a + 706L"],
    correct: 1,
    explanation: "iFOBT gis 701a + 706j.",
  },
  {
    id: 42,
    case: "Pasient med vondt i halsen skal ta en hurtigtest for streptokokker (Strep A).",
    options: ["701a + 706k", "701a + 706L", "701a + 705k", "701a + 708a"],
    correct: 0,
    explanation: "Strep A gis 701a + 706k.",
  },
];
