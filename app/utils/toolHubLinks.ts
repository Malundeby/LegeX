import type { DashboardWidget } from "@/app/utils/widgetStorage";

export interface LinkItem {
  id: string;
  label: string;
  url: string;
}

export interface LinkBox {
  id: string;
  title: string;
  items: LinkItem[];
  description?: string;
}

export const defaultLinkBoxes: LinkBox[] = [
  {
    id: "medicine",
    title: "Medisin",
    items: [
      { id: "med-1", label: "Felleskatalogen", url: "https://www.felleskatalogen.no/medisin/" },
      { id: "med-2", label: "Legemiddelhåndboka", url: "https://www.legemiddelhandboka.no/" },
      { id: "med-3", label: "Interaksjoner", url: "https://interaksjoner.no/" },
      { id: "med-4", label: "RELIS", url: "https://relis.no/" },
      { id: "med-5", label: "Koble", url: "https://koble.info/" },
      { id: "med-6", label: "Trygg Mammamedisin", url: "https://tryggmammamedisin.no/" },
      { id: "med-7", label: "Antibiotika i primærhelsetjenesten", url: "https://www.helsedirektoratet.no/retningslinjer/antibiotika-i-primaerhelsetjenesten" },
      { id: "med-8", label: "Knuse-dele-listen", url: "/pdfs/KnuseDeleListen v16.pdf" }
    ]
  },
  {
    id: "tt-hc",
    title: "Legeerklæringer (LE)",
    items: [
      { id: "tt-1", label: "TT-kort (legeerkl.)", url: "https://innlandstrafikk.no/_f/p4/ic40b9736-aeeb-49d8-966c-649e57eff410/legeerklaering.pdf" },
      { id: "tt-2", label: "TT-kort (pasient)", url: "https://innlandstrafikk.no/_f/p4/i0158ef5d-fe72-4a2a-8c34-9be0f856e66f/tt-kort_innlandet-fylke_innlandstrafikk2022-skrivbar.pdf" },
      { id: "hc-1", label: "HC-park. (legeerkl.)", url: "https://lillehammer.kommune.no/_f/p1/iebadc1ca-c667-4501-8507-88f040fb0b24/legeerklaring-vedlegg-til-soknad-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
      { id: "hc-2", label: "HC-park. (pasient)", url: "https://lillehammer.kommune.no/_f/p1/i8aabafbb-a0c7-4da4-b579-d34425f6b02a/soknadsskjema-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
      { id: "ff-1", label: "Ikrafttredelse fullmakt (legeerkl.)", url: "https://www.statsforvalteren.no/siteassets/fm-oslo-og-viken/vergemal/informasjonsskriv/legeerklaringsskjema-fremtidsfullmakt.pdf" },
      { id: "ts-1", label: "Tillegsstipend (legeerkl.)", url: "https://lanekassen.no/nb-NO/stipend-og-lan/nedsatt-funksjonsevne/soknad-om-tilleggsstipend-ved-nedsatt-funksjonsevne/#samtykke-banner" }
    ]
  },
  {
    id: "generelle",
    title: "Generelle",
    items: [
      { id: "gen-1", label: "Legehandboka", url: "https://legehandboka.no/" },
      { id: "gen-2", label: "Nevrologi Legehandboka", url: "https://nevrologi.legehandboka.no/" },
      { id: "gen-3", label: "Metodebok", url: "https://metodebok.no/index.php" }
    ]
  },
  {
    id: "henvisninger",
    title: "Henvisninger",
    items: [
      { id: "henv-1", label: "Avtalespesialistoversikt", url: "https://avtalespesialister.helse-sorost.no/spesialister1.asp" },
      { id: "henv-2", label: "Skjema for familiær hyperkolesterolemi", url: "https://nktforfh.no/images/uploads/files/Rekvisisjon_for_FH_utfyllbarPDF.pdf" },
      { id: "henv-3", label: "ADHD henvisningsmal", url: "https://www.diakonhjemmetsykehus.no/4961a8/siteassets/documents/mal--henvisning-adhd-2019.pdf" },
      { id: "henv-4", label: "Henvisningsskjema rehabilitering", url: "https://www.sunnaas.no/fag-og-forskning/kompetansesentre-og-tjenester/Regional-koordinerende-enhet/henvisning/henvisning-til-rehabilitering-i-spesialisthelsetjenesten/" }
    ]
  },
  {
    id: "forerkort",
    title: "Førerkort og diverse",
    items: [
      { id: "fk-1", label: "Førerkortveileder", url: "https://www.helsedirektoratet.no/veiledere/forerkortveileder" },
      { id: "fk-2", label: "Egenerklæring", url: "https://www.vegvesen.no/globalassets/forerkort/ta-forerkort/soknad-om-forerkort-og-kompetansebevis-egenerklaering-om-helse.pdf" },
      { id: "div-1", label: "Legemidler førerkort", url: "https://legehandboka.no/handboken/skjema-kalkulatorer/kalkulatorer/diverse/legemiddelkalkulator" }
    ]
  },
  {
    id: "helsedirektoratet-veiledere",
    title: "Helsedirektoratets veiledere",
    items: [
      { id: "hdir-1", label: "Diabetes", url: "https://www.helsedirektoratet.no/retningslinjer/diabetes" },
      { id: "hdir-2", label: "Hjerte og kar", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom" },
      { id: "hdir-3", label: "Hypertensjon", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/kartlegging-av-hypertensjon-ved-forebygging-av-hjerte-og-karsykdom#utredning-av-hoyt-blodtrykk-ved-forebygging-av-hjerte-og-karsydom-praktisk-informasjon" },
      { id: "hdir-4", label: "Hyperkolesterolemi", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom#utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom" },
      { id: "hdir-5", label: "Svangerskap", url: "https://www.helsedirektoratet.no/retningslinjer/svangerskapsomsorgen" }
    ]
  }
];

export function createDefaultBookmarkWidgets(seed = Date.now()): DashboardWidget[] {
  const createdAt = new Date(seed).toISOString();

  return defaultLinkBoxes.map((box, index) => ({
    id: `widget_${seed}_${index + 1}`,
    type: "bookmark",
    title: box.title,
    color: "default",
    pinned: false,
    position: index,
    createdAt,
    links: box.items.map((item) => ({ ...item }))
  }));
}
