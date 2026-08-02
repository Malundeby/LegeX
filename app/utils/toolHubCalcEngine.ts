import type { Calculator } from "@/app/utils/toolRegistry";

export interface ToolHubCalcResult {
  value: string;
  label: string;
  color: string;
  text: string;
  score: number;
  maxScore: number;
  detailedText?: string;
  guideText?: string;
}

export function calculateToolHubCalcResult(
  activeCalc: Calculator | null | undefined,
  calcInputs: Record<string, string | number>
): ToolHubCalcResult | null {
  if (!activeCalc) return null;

  if (activeCalc.id === "bmi") {
    const h = Number(calcInputs["height"]) / 100;
    const w = Number(calcInputs["weight"]);
    if (!h || !w || h <= 0) return null;
    const bmi = w / (h * h);
    const t = activeCalc.thresholds.find((th) => bmi <= th.max);
    const heightCm = Number(calcInputs["height"]);
    const detailedText = `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})\nHøyde: ${heightCm} cm\nVekt: ${w} kg`;
    return {
      value: bmi.toFixed(1),
      label: t?.label ?? "Ukjent",
      color: t?.color ?? "#666",
      text: `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})`,
      score: bmi,
      maxScore: 50,
      detailedText,
      guideText: undefined
    };
  }

  if (activeCalc.id === "fib4") {
    const age = Number(calcInputs["age"]);
    const ast = Number(calcInputs["ast"]);
    const alt = Number(calcInputs["alt"]);
    const platelets = Number(calcInputs["platelets"]);

    if (!age || !ast || !alt || !platelets) return null;

    const fib4 = (age * ast) / (platelets * Math.sqrt(alt));

    let interpretation = "";
    let guideText = "";

    if (age < 35) {
      interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
      guideText = "Veiledning for alder <35 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
    } else if (age <= 65) {
      if (fib4 < 1.3) {
        interpretation = "Lav risiko for avansert fibrose";
      } else if (fib4 <= 2.67) {
        interpretation = "Ubestemt – vurder videre utredning";
      } else {
        interpretation = "Høy risiko for avansert fibrose";
      }
      guideText = "Veiledning for alder 35-65 år:\n• <1.3: Lav risiko\n• 1.3-2.67: Ubestemt\n• >2.67: Høy risiko";
    } else {
      interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
      guideText = "Veiledning for alder >65 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
    }

    const detailedText = `FIB-4: ${fib4.toFixed(2)}\nAlder: ${age} år\nAST: ${ast} U/L\nALT: ${alt} U/L\nTrombocytter: ${platelets} × 10⁹/L\n\n${interpretation}`;

    return {
      value: fib4.toFixed(2),
      label: interpretation,
      color: "#666",
      text: `FIB-4: ${fib4.toFixed(2)} (${interpretation})`,
      score: fib4,
      maxScore: 10,
      detailedText,
      guideText
    };
  }

  if (activeCalc.id === "doak-dosing") {
    const doakType = String(calcInputs["doak-type"]);
    const age80 = calcInputs["age"] === "Ja";
    const weight60 = calcInputs["weight"] === "Ja";
    const creat133 = calcInputs["creatinine"] === "Ja";
    const gfr = String(calcInputs["gfr"]);

    if (!doakType || !gfr) return null;

    let dosing = "";
    let guideText = "";

    if (doakType.includes("Apixaban")) {
      const reducedCriteria = [age80, weight60, creat133].filter(Boolean).length;
      if (gfr === "<15") {
        dosing = "Kontraindisert ved GFR <15";
      } else if (gfr === "15-30") {
        dosing = "Reduser dose: 2,5 mg x 2";
      } else if (reducedCriteria >= 2) {
        dosing = "Reduser dose: 2,5 mg x 2";
      } else {
        dosing = "5 mg x 2";
      }
      guideText = "Atrieflimmer:\n• Standard: 5 mg x 2\n• Reduser dose: 2,5 mg x 2 hvis minst 2 av:\n  - Alder ≥80 år\n  - Vekt ≤60 kg\n  - S-kreatinin ≥133 µmol/L\n• Reduser dose: 2,5 mg x 2 ved GFR 15-30\n• Kontraindisert ved GFR <15";
    } else if (doakType.includes("Rivaroxaban")) {
      if (gfr === "<15") {
        dosing = "Kontraindisert ved GFR <15";
      } else if (gfr === "15-30" || gfr === "30-50") {
        dosing = "Reduser dose: 15 mg x 1 (til mat)";
      } else {
        dosing = "20 mg x 1 (til mat)";
      }
      guideText = "Atrieflimmer:\n• Standard: 20 mg x 1 (til mat) ved GFR >50\n• Reduser dose: 15 mg x 1 (til mat) ved GFR 15-49\n• Kontraindisert ved GFR <15";
    } else if (doakType.includes("Edoxaban")) {
      if (gfr === "<15") {
        dosing = "Kontraindisert ved GFR <15";
      } else if (weight60 || gfr === "15-30" || gfr === "30-50") {
        dosing = "Reduser dose: 30 mg x 1";
      } else {
        dosing = "60 mg x 1";
      }
      guideText = "Atrieflimmer:\n• Standard: 60 mg x 1\n• Reduser dose: 30 mg x 1 hvis:\n  - Vekt ≤60 kg, eller\n  - GFR 15-50\n• Kontraindisert ved GFR <15";
    } else if (doakType.includes("Dabigatran")) {
      if (gfr === "<15" || gfr === "15-30") {
        dosing = "Kontraindisert ved GFR <30";
      } else if (gfr === "30-50" || age80) {
        dosing = "Reduser dose: 110 mg x 2 (150 mg x 2 kan vurderes hvis lav blødningsrisiko)";
      } else {
        dosing = "150 mg x 2";
      }
      guideText = "Atrieflimmer:\n• Standard: 150 mg x 2\n• Reduser dose: 110 mg x 2 hvis:\n  - Alder ≥80 år, eller\n  - GFR 30-50, eller\n  - Økt blødningsrisiko\n• Kontraindisert ved GFR <30";
    }

    const detailedText = `DOAK-dosering\nPreparat: ${doakType}\nGFR: ${gfr} ml/min\n\nAnbefalt dosering:\n${dosing}`;

    return {
      value: dosing || "Velg alle parametere",
      label: "Atrieflimmer",
      color: "#0891b2",
      text: `${doakType} (atrieflimmer): ${dosing}`,
      score: 0,
      maxScore: 1,
      detailedText,
      guideText
    };
  }

  if (activeCalc.id === "psa-age-adjusted") {
    const ageGroup = String(calcInputs["age"]);
    const psaValue = Number(calcInputs["psa-value"]);
    const using5ARI = calcInputs["five-alpha-reductase"] === "Ja";

    if (!ageGroup || !psaValue) return null;

    const adjustedPSA = using5ARI ? psaValue * 2 : psaValue;

    const referenceRanges: Record<string, number> = {
      "40-49": 2.5,
      "50-59": 3.5,
      "60-69": 4.5,
      "70-79": 6.5,
      "≥80": 6.5
    };

    const upperLimit = referenceRanges[ageGroup] || 4.0;
    const isElevated = adjustedPSA > upperLimit;

    let interpretation = "";
    let color = "#4caf50";

    if (isElevated) {
      interpretation = `Forhøyet PSA for alder (referanse: <${upperLimit} µg/L)`;
      color = "#ff9800";
      if (adjustedPSA > upperLimit * 2) {
        interpretation = `Betydelig forhøyet PSA for alder (referanse: <${upperLimit} µg/L)`;
        color = "#f44336";
      }
    } else {
      interpretation = `Innenfor referanse for alder (referanse: <${upperLimit} µg/L)`;
    }

    let detailedText = "Aldersjustert PSA\n";
    detailedText += `Alder: ${ageGroup} år\n`;
    detailedText += `Målt PSA: ${psaValue.toFixed(1)} µg/L\n`;
    if (using5ARI) {
      detailedText += "⚠️ Bruker 5-alfa-reduktasehemmer\n";
      detailedText += `Justert PSA: ${adjustedPSA.toFixed(1)} µg/L (målt × 2)\n`;
    }
    detailedText += `Referanseverdi: <${upperLimit} µg/L\n\n`;
    detailedText += interpretation;

    const guideText = "Aldersjusterte referanseverdier (µg/L):\n• 40-49 år: <2,5\n• 50-59 år: <3,5\n• 60-69 år: <4,5\n• 70-79 år: <6,5\n• ≥80 år: <6,5\n\n⚠️ OBS: Ved bruk av 5-alfa-reduktasehemmer\n(finasterid/dutasterid) skal målt PSA-verdi\ndobles for korrekt tolkning.";

    return {
      value: using5ARI ? `${adjustedPSA.toFixed(1)} µg/L (justert)` : `${psaValue.toFixed(1)} µg/L`,
      label: interpretation,
      color,
      text: `PSA ${using5ARI ? `${adjustedPSA.toFixed(1)} (justert)` : psaValue.toFixed(1)} µg/L - ${interpretation}`,
      score: adjustedPSA,
      maxScore: upperLimit * 2,
      detailedText,
      guideText
    };
  }

  if (activeCalc.id === "anemia-assessment") {
    const gender = String(calcInputs["gender"]);
    const hb = Number(calcInputs["hb"]);
    const mcv = Number(calcInputs["mcv"]);
    const ferritin = Number(calcInputs["ferritin"]);
    const crp = Number(calcInputs["crp"]);
    const b12 = Number(calcInputs["b12"]);
    const folate = Number(calcInputs["folate"]);

    if (!gender || !hb || !mcv) return null;

    const hbThreshold = gender === "Mann" ? 13.4 : 11.7;
    const hasAnemia = hb < hbThreshold;

    let anemiaType = "";
    const recommendations: string[] = [];
    let color = "#4caf50";

    if (!hasAnemia) {
      anemiaType = "Ingen anemi";
      color = "#4caf50";
    } else {
      color = "#ff9800";

      if (mcv < 80) {
        anemiaType = "Mikrocytær anemi";
        recommendations.push("Differensialdiagnoser: jernmangel, thalassemi, kronisk sykdom, sideroblastisk anemi");

        if (ferritin) {
          if (ferritin < 30) {
            recommendations.push(`✓ Ferritin ${ferritin} µg/L tyder på jernmangel`);
            recommendations.push("Anbefalt: Utred årsak til jernmangel (GI-blødning, malabsorpsjon, menstruasjon)");
          } else if (ferritin > 100 && crp && crp > 5) {
            recommendations.push(`Ferritin ${ferritin} µg/L med CRP ${crp} - kan være anemi ved kronisk sykdom`);
          } else {
            recommendations.push(`Ferritin ${ferritin} µg/L - vurder thalassemi eller andre årsaker`);
          }
        } else {
          recommendations.push("Anbefalt: Sjekk ferritin, CRP, jerntransferrinmetning");
        }
      } else if (mcv >= 80 && mcv <= 100) {
        anemiaType = "Normocytær anemi";
        recommendations.push("Differensialdiagnoser: akutt blødning, kronisk sykdom, nyresvikt, hemolytisk anemi, benmargssykdom");
        recommendations.push("Anbefalt: Retikulocytter, nyrefunksjon, hemolyseprøver (LDH, bilirubin, haptoglobin)");

        if (crp && crp > 5) {
          recommendations.push(`CRP ${crp} mg/L - vurder anemi ved kronisk sykdom/infeksjon`);
        }
      } else {
        anemiaType = "Makrocytær anemi";
        recommendations.push("Differensialdiagnoser: B12-mangel, folatmangel, alkohol, hypothyreose, leversykdom, medikamenter");

        if (b12 && b12 < 150) {
          recommendations.push(`✓ B12 ${b12} pmol/L tyder på B12-mangel`);
          recommendations.push("Vurder: Perniøs anemi (Anti-IF, anti-parietalcelle), malabsorpsjon, vegetar/vegansk kosthold");
        } else if (b12) {
          recommendations.push(`B12 ${b12} pmol/L - innenfor/over referanse`);
        } else {
          recommendations.push("Anbefalt: Sjekk B12");
        }

        if (folate && folate < 6) {
          recommendations.push(`✓ Folat ${folate} nmol/L tyder på folatmangel`);
          recommendations.push("Vurder: Malabsorpsjon, alkohol, kosthold, medikamenter (metotreksat, fenytoin)");
        } else if (folate) {
          recommendations.push(`Folat ${folate} nmol/L - innenfor/over referanse`);
        } else {
          recommendations.push("Anbefalt: Sjekk folat");
        }

        recommendations.push("Vurder også: TSH, leverprøver, alkoholanamnese");
      }
    }

    let detailedText = "Anemivurdering\n";
    detailedText += `Kjønn: ${gender}\n`;
    detailedText += `Hb: ${hb.toFixed(1)} g/dL (ref: ${gender === "Mann" ? "≥13.4" : "≥11.7"})\n`;
    detailedText += `MCV: ${mcv.toFixed(1)} fL (ref: 80-100)\n`;
    if (ferritin) detailedText += `Ferritin: ${ferritin} µg/L\n`;
    if (crp) detailedText += `CRP: ${crp} mg/L\n`;
    if (b12) detailedText += `B12: ${b12} pmol/L\n`;
    if (folate) detailedText += `Folat: ${folate} nmol/L\n`;
    detailedText += `\n${anemiaType}\n`;
    if (recommendations.length > 0) {
      detailedText += `\n${recommendations.join("\n")}`;
    }

    const guideText = "Anemigrenser:\n• Mann: Hb <13.4 g/dL\n• Kvinne: Hb <11.7 g/dL\n\nMCV-klassifikasjon:\n• <80 fL: Mikrocytær\n• 80-100 fL: Normocytær\n• >100 fL: Makrocytær\n\nFerritin:\n• <30 µg/L: Jernmangel\n• >100 µg/L med CRP: Akuttfase/inflammasjon\n\nB12: <150 pmol/L = mangel\nFolat: <6 nmol/L = mangel";

    return {
      value: anemiaType,
      label: hasAnemia ? `Hb ${hb.toFixed(1)} - ${anemiaType}` : "Ingen anemi",
      color,
      text: `Hb ${hb.toFixed(1)} g/dL, MCV ${mcv.toFixed(1)} fL - ${anemiaType}`,
      score: hb,
      maxScore: 18,
      detailedText,
      guideText
    };
  }

  if (activeCalc.thresholds && activeCalc.thresholds.length > 0) {
    let totalScore = 0;
    let maxScore = 0;
    let hasAllValues = true;

    for (const field of activeCalc.fields) {
      const value = calcInputs[field.id];
      if (field.type === "select" && field.options) {
        if (!value) {
          hasAllValues = false;
          break;
        }

        const selectedIndex = field.options.indexOf(String(value));

        const match = String(value).match(/^(\d+)/);
        let score = 0;

        if (match) {
          score = parseInt(match[1]);
        } else if (String(value) === "Ja") {
          score = 1;
        } else if (String(value) === "Nei") {
          score = 0;
        } else if (selectedIndex >= 0) {
          score = selectedIndex + 1;
        }

        totalScore += score;

        const maxOption = field.options.reduce((max, opt, idx) => {
          const m = opt.match(/^(\d+)/);
          if (m) {
            return Math.max(max, parseInt(m[1]));
          }
          if (opt === "Ja") {
            return Math.max(max, 1);
          }
          if (opt === "Nei") {
            return max;
          }
          return Math.max(max, idx + 1);
        }, 0);
        maxScore += maxOption;
      }
    }

    if (!hasAllValues) return null;

    const t = activeCalc.thresholds.find((th) => totalScore <= th.max);

    let detailedText: string | undefined = undefined;

    if (activeCalc.id === "ipss") {
      const questionLabels = [
        "Ufullstendig tømming",
        "Hyppig vannlating (<2t)",
        "Avbrutt vannlating",
        "Vannlatingstrang",
        "Svak stråle",
        "Må presse for å starte",
        "Nocturi (ganger per natt)"
      ];

      detailedText =
        activeCalc.fields
          .map((field, idx) => {
            const value = calcInputs[field.id];
            const match = String(value).match(/^(\d+)/);
            const score = match ? parseInt(match[1]) : 0;
            return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
          })
          .join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
    } else if (activeCalc.id === "cat") {
      const questionLabels = [
        "Hoste",
        "Slim",
        "Trykk i brystet",
        "Tungpust ved trapper",
        "Aktivitetsbegrensning",
        "Trygghet ved å gå ut",
        "Søvnkvalitet",
        "Energinivå"
      ];

      detailedText =
        activeCalc.fields
          .map((field, idx) => {
            const value = calcInputs[field.id];
            const match = String(value).match(/^(\d+)/);
            const score = match ? parseInt(match[1]) : 0;
            return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
          })
          .join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
    } else if (activeCalc.id === "nyha" || activeCalc.id === "ccs" || activeCalc.id === "mmrc") {
      const field = activeCalc.fields[0];
      const value = calcInputs[field.id];
      const description = String(value).split(" – ")[1] || String(value);

      let labelWithScore = "";
      if (activeCalc.id === "nyha") {
        labelWithScore = `NYHA ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === "ccs") {
        labelWithScore = `CCS ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === "mmrc") {
        labelWithScore = `mMRC ${totalScore}/${maxScore}`;
      }

      detailedText = `${labelWithScore}: ${description}`;
    }

    const cleanName = activeCalc.name
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
      .trim();

    let copyText = "";
    if (activeCalc.id === "nyha") {
      copyText = `NYHA (hjertesvikt): ${totalScore}/${maxScore}`;
    } else if (activeCalc.id === "ccs") {
      copyText = `CCS (angina): ${totalScore}/${maxScore}`;
    } else if (activeCalc.id === "mmrc") {
      copyText = `mMRC (dyspne): ${totalScore}/${maxScore}`;
    } else {
      copyText = `${cleanName}: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
    }

    return {
      value: totalScore.toString(),
      label: t?.label ?? "Ukjent",
      color: t?.color ?? "#666",
      text: copyText,
      score: totalScore,
      maxScore,
      detailedText,
      guideText: undefined
    };
  }

  return null;
}
