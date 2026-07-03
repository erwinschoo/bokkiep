import type { RuleRow } from "../db/types";
import { uid } from "../lib/id";

/* Pas regels toe op een transactie-achtig object. Retourneert de eerste matchende
 * regel (op prioriteit, laag eerst) of null. Handig als je ook het patroon nodig
 * hebt (bv. voor een suggestie-reden). */
export function matchRule(
  fields: { merchant: string; rawDescription: string },
  rules: RuleRow[],
): RuleRow | null {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const r of sorted) {
    const hay = (r.field === "merchant" ? fields.merchant : fields.rawDescription) || "";
    if (testRule(hay, r)) return r;
  }
  return null;
}

/* Pas regels toe op een transactie-achtig object. Retourneert de category id of "". */
export function matchCategory(
  fields: { merchant: string; rawDescription: string },
  rules: RuleRow[],
): string {
  return matchRule(fields, rules)?.categoryId ?? "";
}

function testRule(haystack: string, r: RuleRow): boolean {
  if (r.matchType === "regex") {
    try {
      return new RegExp(r.pattern, "i").test(haystack);
    } catch {
      return false;
    }
  }
  return haystack.toUpperCase().includes(r.pattern.toUpperCase());
}

/* Maak een nieuwe "bevat"-regel op basis van een handmatige indeling. */
export function makeRule(
  field: "merchant" | "rawDescription",
  pattern: string,
  categoryId: string,
  priority = 100,
): RuleRow {
  return { id: uid("r"), field, pattern, matchType: "contains", categoryId, priority };
}

/* Standaardregels — herkennen veel voorkomende NL-merchants in ING-omschrijvingen.
 * 'contains' is hoofdletter-ongevoelig. Lagere priority = eerder geëvalueerd. */
export const DEFAULT_RULES: Omit<RuleRow, "id">[] = [
  // inkomen / sparen (specifiek → lage priority)
  { field: "rawDescription", pattern: "SALARIS", matchType: "contains", categoryId: "inkomen", priority: 10 },
  { field: "rawDescription", pattern: "SPAARREKENING", matchType: "contains", categoryId: "sparen", priority: 10 },
  // aflossingen / studieschuld
  { field: "rawDescription", pattern: "DUO", matchType: "contains", categoryId: "aflossingen", priority: 15 },
  { field: "rawDescription", pattern: "STUDIEFINANCIERING", matchType: "contains", categoryId: "aflossingen", priority: 15 },
  // wonen
  { field: "rawDescription", pattern: "HUUR", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "VESTEDA", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "ENECO", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "VITENS", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "GEMEENTE", matchType: "contains", categoryId: "wonen", priority: 25 },
  // boodschappen
  { field: "rawDescription", pattern: "ALBERT HEIJN", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "AH ", matchType: "contains", categoryId: "boodschappen", priority: 35 },
  { field: "rawDescription", pattern: "JUMBO", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "LIDL", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "DIRK", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "MARQT", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "BAKKER", matchType: "contains", categoryId: "boodschappen", priority: 35 },
  // vervoer
  { field: "rawDescription", pattern: "SHELL", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "NS GROEP", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "NS REIZEN", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "Q-PARK", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "OV-CHIP", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "SWAPFIETS", matchType: "contains", categoryId: "vervoer", priority: 30 },
  // abonnementen
  { field: "rawDescription", pattern: "NETFLIX", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "SPOTIFY", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "KPN", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "ICLOUD", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "PAROOL", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "FITFORFREE", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  // gezondheid
  { field: "rawDescription", pattern: "ETOS", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "APOTHEEK", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "TANDARTS", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "FYSIO", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  // vrije tijd
  { field: "rawDescription", pattern: "RESTAURANT", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "TOSCANA", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "CAFE", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "PATHE", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "BOL.COM", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "COOLBLUE", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "DECATHLON", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  // verzekeringen
  { field: "rawDescription", pattern: "ZILVEREN KRUIS", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "CENTRAAL BEHEER", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "INTERPOLIS", matchType: "contains", categoryId: "verzekeringen", priority: 30 },

  /* ── Uitgebreide NL-merchantlijst ──
   * Trefwoord-suggesties zijn tier-3 (worden altijd eerst ter controle voorgesteld,
   * niet stil vastgezet). Voor korte/botsingsgevoelige termen (BP, SPAR, PLUS, COOP…)
   * gebruiken we regex met woordgrenzen zodat 'sparen'/'surplus' e.d. niet meelopen. */

  // wonen — energie & water
  { field: "rawDescription", pattern: "HYPOTHEEK", matchType: "contains", categoryId: "wonen", priority: 18 },
  { field: "rawDescription", pattern: "VATTENFALL", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "ESSENT", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "GREENCHOICE", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "VANDEBRON", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "OXXIO", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "ENGIE", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "BUDGET ENERGIE", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "PURE ENERGIE", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "FRANK ENERGIE", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "EVIDES", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "WATERNET", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "BRABANT WATER", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "DUNEA", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "OASEN", matchType: "contains", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "\\bPWN\\b", matchType: "regex", categoryId: "wonen", priority: 20 },
  { field: "rawDescription", pattern: "\\bVVE\\b", matchType: "regex", categoryId: "wonen", priority: 22 },

  // belastingen & overheidsheffingen
  { field: "rawDescription", pattern: "BELASTINGDIENST", matchType: "contains", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "BGHU", matchType: "contains", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "WATERSCHAP", matchType: "contains", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "HOOGHEEMRAADSCHAP", matchType: "contains", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "\\bCJIB\\b", matchType: "regex", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "\\bSVHW\\b", matchType: "regex", categoryId: "belastingen", priority: 24 },
  { field: "rawDescription", pattern: "\\bBSGW\\b", matchType: "regex", categoryId: "belastingen", priority: 24 },

  // verzekeringen
  { field: "rawDescription", pattern: "ZORGVERZEKERAAR", matchType: "contains", categoryId: "verzekeringen", priority: 28 },
  { field: "rawDescription", pattern: "ZORG EN ZEKERHEID", matchType: "contains", categoryId: "verzekeringen", priority: 28 },
  { field: "rawDescription", pattern: "ACHMEA", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "INDEPENDER", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "MENZIS", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "\\bVGZ\\b", matchType: "regex", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "\\bCZ\\b", matchType: "regex", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "UNIVE", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "\\bFBTO\\b", matchType: "regex", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "\\bOHRA\\b", matchType: "regex", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "DITZO", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "INSHARED", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "PROMOVENDUM", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "NATIONALE NEDERLANDEN", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "AEGON", matchType: "contains", categoryId: "verzekeringen", priority: 30 },
  { field: "rawDescription", pattern: "\\bDELA\\b", matchType: "regex", categoryId: "verzekeringen", priority: 30 },

  // abonnementen — telecom, streaming, software, sport
  { field: "rawDescription", pattern: "ZIGGO", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "merchant", pattern: "SIMPEL", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "VODAFONE", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "ODIDO", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "T-MOBILE", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "TELE2", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "YOUFONE", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "LEBARA", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "AMAZON PRIME", matchType: "contains", categoryId: "abonnementen", priority: 28 },
  { field: "rawDescription", pattern: "DISNEY", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "VIAPLAY", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "VIDEOLAND", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "HBO MAX", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "\\bDAZN\\b", matchType: "regex", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "YOUTUBE PREMIUM", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "ADOBE", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "MICROSOFT 365", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "DROPBOX", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "STRAVA", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "BASICFIT", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "BASIC FIT", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "BIGGYM", matchType: "contains", categoryId: "abonnementen", priority: 30 },
  { field: "rawDescription", pattern: "SPORTCITY", matchType: "contains", categoryId: "abonnementen", priority: 30 },

  // boodschappen — supermarkten & markt
  { field: "rawDescription", pattern: "NETTORAMA", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "ALDI", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "HOOGVLIET", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "DEKAMARKT", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "VOMAR", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "POIESZ", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "PICNIC", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "EKOPLAZA", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "JAN LINDERS", matchType: "contains", categoryId: "boodschappen", priority: 30 },
  { field: "rawDescription", pattern: "MARKTHANDEL", matchType: "contains", categoryId: "boodschappen", priority: 35 },
  { field: "rawDescription", pattern: "GALL & GALL", matchType: "contains", categoryId: "boodschappen", priority: 35 },
  { field: "rawDescription", pattern: "\\bSPAR\\b", matchType: "regex", categoryId: "boodschappen", priority: 35 },
  { field: "rawDescription", pattern: "\\bPLUS\\b", matchType: "regex", categoryId: "boodschappen", priority: 35 },
  { field: "rawDescription", pattern: "\\bCOOP\\b", matchType: "regex", categoryId: "boodschappen", priority: 35 },

  // vervoer — brandstof, laden, OV, parkeren, wasstraat
  { field: "rawDescription", pattern: "ESSO", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "TANGO", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "TINQ", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "TOTALENERGIES", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "\\bBP\\b", matchType: "regex", categoryId: "vervoer", priority: 32 },
  { field: "rawDescription", pattern: "OVPAY", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "GREENWHEELS", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "ARRIVA", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "CONNEXXION", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "QBUZZ", matchType: "contains", categoryId: "vervoer", priority: 30 },
  { field: "rawDescription", pattern: "PARKMOBILE", matchType: "contains", categoryId: "vervoer", priority: 32 },
  { field: "rawDescription", pattern: "YELLOWBRICK", matchType: "contains", categoryId: "vervoer", priority: 32 },
  { field: "rawDescription", pattern: "WASSTRAAT", matchType: "contains", categoryId: "vervoer", priority: 35 },

  // gezondheid — drogist & zorg
  { field: "rawDescription", pattern: "KRUIDVAT", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "TREKPLEISTER", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "HOLLAND & BARRETT", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "HOSPITALENTS", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "HUISARTS", matchType: "contains", categoryId: "gezondheid", priority: 30 },
  { field: "rawDescription", pattern: "ZIEKENHUIS", matchType: "contains", categoryId: "gezondheid", priority: 30 },

  // kleding & verzorging
  { field: "rawDescription", pattern: "ZEEMAN", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "WIBRA", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "PRIMARK", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "C&A", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "VANHAREN", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "VAN HAREN", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "HUNKEMOLLER", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "H&M", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "BIJENKORF", matchType: "contains", categoryId: "kleding", priority: 32 },
  { field: "rawDescription", pattern: "KAPSALON", matchType: "contains", categoryId: "kleding", priority: 34 },
  { field: "rawDescription", pattern: "\\bHEMA\\b", matchType: "regex", categoryId: "kleding", priority: 35 },

  // vrije tijd — horeca, uitgaan, bezorging, entertainment
  { field: "rawDescription", pattern: "COFFEESHOP", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "GOLFPARK", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "KINEPOLIS", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "\\bVUE\\b", matchType: "regex", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "AFAS LIVE", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "AFAS CIRCUS", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "THUISBEZORGD", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "UBER EATS", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "DELIVEROO", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "NEW YORK PIZZA", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "DOMINO", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "MCDONALD", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "BURGER KING", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "\\bKFC\\b", matchType: "regex", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "STARBUCKS", matchType: "contains", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "\\bFEBO\\b", matchType: "regex", categoryId: "vrijetijd", priority: 40 },
  { field: "rawDescription", pattern: "DONER", matchType: "contains", categoryId: "vrijetijd", priority: 42 },
  { field: "rawDescription", pattern: "MEDIAMARKT", matchType: "contains", categoryId: "vrijetijd", priority: 42 },
  { field: "rawDescription", pattern: "PLAYSTATION", matchType: "contains", categoryId: "vrijetijd", priority: 42 },
  { field: "rawDescription", pattern: "NINTENDO", matchType: "contains", categoryId: "vrijetijd", priority: 42 },

  // overig — variety stores
  { field: "rawDescription", pattern: "\\bACTION\\b", matchType: "regex", categoryId: "overig", priority: 45 },
];
