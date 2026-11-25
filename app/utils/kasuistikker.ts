/**
 * Kasuistikker til læring og diskusjon. Oppdiktede pasienter.
 * Innholdet skal kvalitetssikres av lege før bruk i undervisning.
 */

export type KasuistikkSection = "fastlege" | "helsesekretaer" | "legevakt";

export const KASUISTIKK_SECTIONS: { id: KasuistikkSection; label: string; intro: string }[] = [
  { id: "fastlege", label: "Fastlege", intro: "Problemstillinger fra fastlegekontoret." },
  { id: "helsesekretaer", label: "Helsesekretær", intro: "Telefon og skranke: hastegrad, råd og takst." },
  { id: "legevakt", label: "Legevakt", intro: "Akutte problemstillinger på legevakt." },
];

export interface Kasuistikk {
  id: string;
  section: KasuistikkSection;
  title: string;
  tags: string[];
  presentasjon: string;
  sporsmal: string[];
  drofting: string;
  laeringspunkter: string[];
  /** Relevante takstkoder fra takstkartoteket. */
  takster?: string[];
}

export const KASUISTIKKER: Kasuistikk[] = [
  // ---------------- Fastlege ----------------
  {
    id: "fl-hodepine",
    section: "fastlege",
    title: "Plutselig, kraftig hodepine",
    tags: ["hodepine", "subaraknoidalblødning", "røde flagg"],
    presentasjon:
      "Kvinne, 48 år, ringer og får øyeblikkelig time. Hun fikk i går kveld plutselig den verste hodepinen hun har hatt, med full styrke i løpet av sekunder mens hun bar handleposer. Kastet opp én gang. I dag er hun litt bedre og har tatt paracetamol. Hun har migrene fra før, men sier dette var annerledes. Ved undersøkelse er hun våken og orientert, lett nakkestiv, ingen fokale utfall.",
    sporsmal: [
      "Hva er den viktigste differensialdiagnosen?",
      "Endrer det noe at hun har migrene fra før og er bedre i dag?",
      "Hva gjør du videre?",
    ],
    drofting:
      "Tordenskrallhodepine, altså maksimal styrke i løpet av sekunder til ett minutt, skal oppfattes som subaraknoidalblødning til det motsatte er bevist. At hun har kjent migrene og er bedre dagen etter, utelukker ikke blødning. En varselblødning kan gi bedring før en ny, større blødning. Pasienten skal ha akutt innleggelse for CT og eventuelt spinalpunksjon, og man skal ikke avvente bedring.",
    laeringspunkter: [
      "Spør alltid hvor raskt hodepinen nådde full styrke",
      "Ny type hodepine hos en migrenepasient er et rødt flagg",
      "Bedring utelukker ikke subaraknoidalblødning",
    ],
    takster: ["2ad"],
  },
  {
    id: "fl-legemidler-fall",
    section: "fastlege",
    title: "Eldre kvinne som faller",
    tags: ["fall", "legemiddelgjennomgang", "eldre", "polyfarmasi"],
    presentasjon:
      "Kvinne, 84 år, bor alene med hjemmesykepleie. Hun har falt to ganger den siste måneden uten å skade seg. Hun bruker ti faste legemidler, blant annet blodtrykksmedisin, vanndrivende, en sovetablett og et antidepressivum. Datteren lurer på om hun bør flytte på sykehjem.",
    sporsmal: [
      "Hvilke årsaker til fall vil du se etter?",
      "Hvordan går du frem med legemidlene?",
      "Hvem bør du samarbeide med?",
    ],
    drofting:
      "Fall hos eldre har ofte flere årsaker samtidig. Legemidler er en av de viktigste og lettest å gjøre noe med. Se særlig etter blodtrykksfall ved oppreisning (mål blodtrykk liggende og stående), sovemedisin og andre sederende legemidler, og vanndrivende som gir hyppig vannlating om natten. En systematisk legemiddelgjennomgang med oppdatert liste, gjerne sammen med hjemmesykepleien, er et naturlig første steg. Vurder også syn, muskelstyrke og balanse, og om boligen kan tilrettelegges. Mange kan bo hjemme videre med riktige tiltak.",
    laeringspunkter: [
      "Mål ortostatisk blodtrykk hos eldre som faller",
      "Sederende legemidler øker fallrisikoen",
      "Legemiddelgjennomgang er et konkret tiltak med god effekt",
    ],
    takster: ["2ad", "2ld"],
  },
  {
    id: "fl-hoste-royker",
    section: "fastlege",
    title: "Langvarig hoste hos røyker",
    tags: ["hoste", "lungekreft", "kols", "røyking"],
    presentasjon:
      "Mann, 63 år, kommer fordi kona maser. Han har hostet i 7 uker etter en forkjølelse, og mener det bare er røykehoste. Han har røykt 20 sigaretter om dagen i 40 år. Han har gått ned 4 kg uten å prøve. Ved undersøkelse er lungene normale.",
    sporsmal: [
      "Hva bekymrer deg i sykehistorien?",
      "Hvilken utredning vil du starte?",
      "Hvordan følger du opp?",
    ],
    drofting:
      "Hoste som varer i mer enn noen uker hos en langvarig røyker, sammen med uforklart vekttap, skal utredes for lungekreft selv om lungestetoskopien er normal. Bildediagnostikk av thorax er sentralt, og ved mistanke skal pasienten henvises etter pakkeforløp for lungekreft. Spirometri kan i tillegg avdekke KOLS. Avtal konkret oppfølging og sørg for at svaret blir fulgt opp. Røykeslutt bør tas opp uansett funn.",
    laeringspunkter: [
      "Normal auskultasjon utelukker ikke alvorlig lungesykdom",
      "Uforklart vekttap er et rødt flagg",
      "Kjenn kriteriene for pakkeforløp for lungekreft",
    ],
    takster: ["2ad"],
  },

  // ---------------- Helsesekretær ----------------
  {
    id: "hs-spedbarn-feber",
    section: "helsesekretaer",
    title: "Spedbarn med feber",
    tags: ["feber", "spedbarn", "hastegrad"],
    presentasjon:
      "En mor ringer kl. 10. Datteren er 7 uker og har 38,4 i temperatur. Hun ammer litt dårligere enn vanlig, men er våken. Mor spør om hun kan få en time i morgen, fordi hun ikke har bil i dag.",
    sporsmal: ["Hvor raskt må barnet vurderes av lege?", "Hva sier du til mor?", "Hvordan dokumenterer du samtalen?"],
    drofting:
      "Barn under 3 måneder med feber skal vurderes av lege samme dag, uansett hvor fine de virker. Små spedbarn kan ha alvorlige infeksjoner uten tydelige tegn. Snakk med legen med en gang, og hjelp mor med å finne en løsning for å komme seg til kontoret eller legevakten nå, for eksempel drosje eller ambulanse hvis barnet blir dårligere. En time i morgen er ikke forsvarlig.",
    laeringspunkter: [
      "Alder under 3 måneder og feber: lege samme dag",
      "Praktiske hindringer skal løses, ikke avgjøre hastegraden",
      "Dokumenter hva som ble sagt og hvilken lege som ble konferert",
    ],
    takster: ["1bd"],
  },
  {
    id: "hs-halsbrann",
    section: "helsesekretaer",
    title: "Halsbrann som ikke går over",
    tags: ["brystsmerter", "hjerteinfarkt", "atypisk"],
    presentasjon:
      "Mann, 58 år, ringer og vil ha resept på syrenøytraliserende. Han har hatt halsbrann og ubehag øverst i magen siden i morges, og føler seg litt kaldsvett. Han har høyt blodtrykk og røyker. Han sier det sikkert er noe han har spist.",
    sporsmal: ["Hva er du redd for?", "Hva gjør du?", "Hvorfor er det lett å overse?"],
    drofting:
      "Hjerteinfarkt kan vise seg som halsbrann eller ubehag øverst i magen, særlig sammen med kaldsvette og risikofaktorer som høyt blodtrykk og røyking. Pasienten skal ringe 113 nå, eller du ringer for ham. Varsle legen samtidig. Ikke la pasientens egen forklaring styre hastegraden.",
    laeringspunkter: [
      "Ubehag øverst i magen med kaldsvette kan være hjerteinfarkt",
      "Spør etter kaldsvette, tungpust og utstråling",
      "Ved tvil: 113",
    ],
  },
  {
    id: "hs-provesvar",
    section: "helsesekretaer",
    title: "Prøvesvar og spørsmål om medisinen",
    tags: ["prøvesvar", "takst", "delegasjon"],
    presentasjon:
      "En kvinne ringer for å høre svaret på blodprøvene. Legen har skrevet «Normalt stoffskifte, fortsett samme dose». Kvinnen spør i tillegg om hun kan ta tablettene sammen med frokosten, fordi hun glemmer dem om morgenen.",
    sporsmal: ["Hva kan du svare på selv?", "Utløser samtalen takst?", "Hva skriver du i journalen?"],
    drofting:
      "Du kan formidle legens beskjed om at stoffskiftet er normalt og at hun skal fortsette samme dose. Når du formidler legens beskjed, utløses takst 1bd. Spørsmålet om å ta tablettene sammen med mat er et nytt medisinsk spørsmål. Det skal du konferere med legen om, eller svare på etter en skriftlig prosedyre fra legen. Hadde du bare sagt at svaret var kommet, uten å formidle noen vurdering eller råd, ville det ikke gitt takst.",
    laeringspunkter: [
      "Formidle legens beskjed ordrett",
      "Nye medisinske spørsmål: konferer lege eller følg prosedyre",
      "Enkel beskjed om prøvesvar uten råd gir ikke takst",
    ],
    takster: ["1bd"],
  },

  // ---------------- Legevakt ----------------
  {
    id: "lv-meningokokk",
    section: "legevakt",
    title: "Ung mann med feber og utslett",
    tags: ["meningokokksykdom", "sepsis", "petekkier"],
    presentasjon:
      "Mann, 19 år, kommer med kameraten. Han har hatt feber, hodepine og vondt i bena siden i ettermiddag og er blitt raskt dårligere. Han er blek, kalde hender og føtter, puls 125. Du ser noen små, røde prikker på leggene som ikke blekner ved trykk.",
    sporsmal: ["Hva mistenker du?", "Hva er det viktigste å gjøre de neste minuttene?", "Hvem skal varsles?"],
    drofting:
      "Feber, rask forverring, kalde ekstremiteter, smerter i bena og petekkier som ikke blekner er typisk for systemisk meningokokksykdom. Tid er avgjørende. Gi antibiotika (benzylpenicillin etter Legemiddelhåndboka eller lokal prosedyre) med en gang, før transport, og ikke vent på prøver. Rekvirer ambulanse med hastegrad akutt, gi oksygen og start væske ved tegn på sirkulasjonssvikt. Varsle sykehuset. Nærkontakter skal vurderes for forebyggende behandling i samråd med kommuneoverlegen.",
    laeringspunkter: [
      "Petekkier og feber: tenk meningokokksykdom",
      "Antibiotika skal gis før transport",
      "Kalde hender og føtter og smerter i bena kan komme før utslettet",
    ],
    takster: ["2ak"],
  },
  {
    id: "lv-delirium",
    section: "legevakt",
    title: "Eldre kvinne som er blitt forvirret",
    tags: ["delirium", "forvirring", "eldre", "infeksjon"],
    presentasjon:
      "Hjemmesykepleien ringer om en kvinne på 82 år. Siden i går har hun vært urolig og forvirret, og i natt prøvde hun å gå ut. Hun er vanligvis klar og klarer seg selv. Hun har ikke målt feber. Sykepleieren lurer på om hun har fått demens.",
    sporsmal: ["Hva er mest sannsynlig?", "Hvilke årsaker leter du etter?", "Kan hun bli hjemme?"],
    drofting:
      "Akutt forvirring over timer til dager hos en ellers klar eldre person er delirium til det motsatte er vist, ikke demens. Delirium er et tegn på at noe er galt i kroppen. Vanlige årsaker er infeksjon (urinveier, lunger), legemidler, uttørking, urinretensjon, forstoppelse, smerter og blodsukkerforstyrrelser. Hun må undersøkes, enten på legevakt eller ved sykebesøk. Om hun kan bli hjemme, avhenger av årsaken, hvor dårlig hun er og hvor mye hjelp som er tilgjengelig.",
    laeringspunkter: [
      "Akutt forvirring hos eldre: tenk delirium",
      "Finn og behandle årsaken",
      "Feber mangler ofte hos eldre med infeksjon",
    ],
    takster: ["2ak", "11ak", "1bk"],
  },
  {
    id: "lv-ankel",
    section: "legevakt",
    title: "Overtråkk på ankelen",
    tags: ["ankel", "brudd", "Ottawa", "røntgen"],
    presentasjon:
      "Kvinne, 32 år, tråkket over på fotball i kveld. Ankelen er hoven på utsiden. Hun klarte å gå inn fra bilen med litt halting. Hun er øm foran og under ytre ankelknoke, men ikke på baksiden eller spissen av knoken, og ikke over basis av femte mellomfotsben.",
    sporsmal: ["Trenger hun røntgen?", "Hvilke råd gir du?", "Når skal hun komme tilbake?"],
    drofting:
      "Ottawa ankelregler sier at røntgen av ankelen er aktuelt ved smerter rundt ankelknokene og enten ømhet på bakre kant eller spissen av en ankelknoke (nederste 6 cm), eller at pasienten ikke klarer å gå fire skritt både rett etter skaden og ved undersøkelsen. For foten gjelder ømhet over basis av femte mellomfotsben eller båtbenet. Hun oppfyller ingen av kriteriene og trenger ikke røntgen. Råd om ro de første dagene, kompresjon, høyt leie og gradvis belastning etter smerte. Ny vurdering hvis hun ikke kan belaste foten eller ikke blir bedre i løpet av en uke.",
    laeringspunkter: [
      "Bruk Ottawa ankelregler for å unngå unødvendig røntgen",
      "Undersøk ømhet presist: bakre kant og spiss av ankelknokene",
      "Gi klare råd om når hun skal komme tilbake",
    ],
    takster: ["2ak"],
  },
];
