export interface ParsedVisit {
  visit_date: string;
  diagnosis: string;
  treatment: string;
  treatment_cost: number | null;
  notes: string;
}

export interface ParsedPatientRecord {
  patient: Record<string, string | string[]>;
  medicalHistory: Record<string, string | string[]>;
  visits: ParsedVisit[];
  rawText: string;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    // Multi-page scans are joined with a separator; it is not record content.
    .replace(/-{2,}\s*page break\s*-{2,}/gi, "\n")
    .replace(/^\s*[-_=]{3,}\s*$/gm, "")
    .replace(/[|]/g, "I")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

const cleanValue = (raw: string): string =>
  raw
    .replace(/^[:\-–_.\s]+/, "")
    .replace(/_+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[.,;]+|[.,;]+$/g, "")
    .trim();

const looksLikeLabel = (line: string): boolean => /^[A-Za-z][A-Za-z .'/-]{0,40}:$/.test(line.trim());

/**
 * Reads a value for a label. Physical forms put the value either on the same
 * line ("Name: Maria Santos") or underneath the label ("Name:" then the value),
 * and OCR often leaves the label alone on its line, so both are supported.
 */
const extractLabelValue = (text: string, labels: string[]): string => {
  const lines = text.split("\n").map((line) => line.trim());

  for (const label of labels) {
    const pattern = new RegExp(`^${escapeRegExp(label)}\\b\\s*[:\\-–]?\\s*(.*)$`, "i");

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line) continue;

      const match = line.match(pattern);
      if (!match) continue;

      const inline = cleanValue(match[1] ?? "");
      if (inline && !looksLikeLabel(inline)) return inline;

      const nextLine = lines.slice(index + 1).find((candidate) => candidate.length > 0);
      if (nextLine && !looksLikeLabel(nextLine)) {
        const value = cleanValue(nextLine);
        if (value) return value;
      }
    }
  }

  return "";
};

const extractPhone = (text: string): string => {
  const labeled = extractLabelValue(text, [
    "phone",
    "mobile",
    "cell",
    "contact number",
    "telephone",
    "tel",
  ]);
  if (labeled) {
    const digits = labeled.replace(/[^\d+]/g, "");
    if (digits.length >= 10) return digits;
  }

  const match = text.match(/\b(0?9\d{9})\b/);
  return match?.[1]?.replace(/[^\d]/g, "") ?? "";
};

const extractEmail = (text: string): string => {
  const labeled = extractLabelValue(text, ["email", "e-mail"]);
  if (labeled && labeled.includes("@")) return labeled;

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
};

const parseDateToIso = (value: string): string => {
  const cleaned = value.trim();
  if (!cleaned) return "";

  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return cleaned;

  const slashMatch = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slashMatch) {
    const [, part1, part2, yearPart] = slashMatch;
    const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const month = Number(part1) > 12 ? part2 : part1;
    const day = Number(part1) > 12 ? part1 : part2;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return "";
};

const UI_NOISE_LINE =
  /^(?:patient records?|search patients|view reco|register new patient|dental clinic|access portal|login|appointments?|manage dentists?|page break)$/i;

const isUiNoiseLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (UI_NOISE_LINE.test(trimmed)) return true;
  if (/^search patients by/i.test(trimmed)) return true;
  if (/^(?:x-?rays?|certificate|view reco)/i.test(trimmed)) return true;
  if (/^[^A-Za-z0-9]+$/.test(trimmed)) return true;
  return false;
};

const extractDateFromText = (text: string): string => {
  const labeled = extractLabelValue(text, [
    "date of birth",
    "dob",
    "birth date",
    "birthdate",
  ]);
  if (labeled) {
    const parsed = parseDateToIso(labeled);
    if (parsed) return parsed;
  }

  const match = text.match(/(?:^|\s)(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})(?:\s|$)/);
  if (match?.[1]) return parseDateToIso(match[1]);

  return "";
};

const extractGenderFromText = (text: string): string => {
  const labeled = extractLabelValue(text, ["gender", "sex"]).toLowerCase();
  if (labeled) {
    if (labeled.includes("other")) return "other";
    if (labeled.includes("female")) return "female";
    if (labeled.includes("male")) return "male";
    if (/^f\b/.test(labeled)) return "female";
    if (/^m\b/.test(labeled)) return "male";
  }

  if (/\bfemale\b/i.test(text)) return "female";
  if (/\bmale\b/i.test(text)) return "male";
  return "";
};

const parseNameLine = (
  line: string
): { first_name: string; last_name: string; gender?: string } | null => {
  const cleaned = line
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z\s'.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || isUiNoiseLine(cleaned)) return null;

  const withGender = cleaned.match(
    /^([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})\s+(male|female|other)$/i
  );
  if (withGender) {
    const nameParts = withGender[1].trim().split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      return {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" "),
        gender: withGender[2].toLowerCase(),
      };
    }
  }

  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((part) => part.trim());
    if (first && last) {
      return { first_name: first, last_name: last };
    }
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return null;
  if (!parts.every((part) => /^[A-Za-z][A-Za-z'.-]*$/.test(part))) return null;
  if (["patient", "records", "search", "email", "phone", "view", "name"].includes(parts[0].toLowerCase())) {
    return null;
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
};

const extractNameParts = (
  text: string
): { first_name: string; last_name: string; gender?: string } => {
  const fullName = extractLabelValue(text, [
    "patient name",
    "name of patient",
    "full name",
    "name",
  ]);

  if (fullName) {
    if (fullName.includes(",")) {
      const [last, first] = fullName.split(",").map((part) => part.trim());
      return { first_name: first ?? "", last_name: last ?? "" };
    }

    const parsed = parseNameLine(fullName);
    if (parsed) return parsed;
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 3);

  for (const line of lines) {
    const parsed = parseNameLine(line);
    if (parsed?.first_name && parsed?.last_name) {
      return parsed;
    }
  }

  return { first_name: "", last_name: "" };
};

const extractAmount = (value: string): number | null => {
  const match = value.match(/(?:₱|php|peso)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match?.[1]) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
};

const CHECK_MARK = "(?:☑|☒|✓|✔|\\[x\\]|\\(x\\)|\\bx\\b)";

const detectYesNo = (value: string): string => {
  const cleaned = value.trim();
  if (!cleaned) return "";

  const checkedYes = new RegExp(`${CHECK_MARK}\\s*y(?:es)?\\b|\\by(?:es)?\\s*${CHECK_MARK}`, "i");
  const checkedNo = new RegExp(`${CHECK_MARK}\\s*no\\b|\\bno\\s*${CHECK_MARK}`, "i");

  if (checkedYes.test(cleaned)) return "yes";
  if (checkedNo.test(cleaned)) return "no";
  if (/^y(?:es)?\b/i.test(cleaned)) return "yes";
  if (/^no\b/i.test(cleaned)) return "no";
  if (/\byes\b/i.test(cleaned) && !/\bno\b/i.test(cleaned)) return "yes";
  if (/\bno\b/i.test(cleaned) && !/\byes\b/i.test(cleaned)) return "no";

  return "";
};

/**
 * Questionnaire answers are usually printed as "Label  ☐ Yes  ☐ No", and OCR
 * may put the answer on the next line. A bare "Yes No" pair (both boxes read,
 * neither mark detected) carries no answer, so it is treated as unknown.
 */
const extractYesNo = (text: string, labels: string[]): string => {
  const lines = text.split("\n").map((line) => line.trim());

  for (const label of labels) {
    // Labels sit inside questions on printed forms ("Are you in good health?"),
    // so the label is located anywhere in the line and the answer is read after it.
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, "i");

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const match = line.match(pattern);
      if (!match || match.index === undefined) continue;

      const afterLabel = line.slice(match.index + match[0].length);
      const inline = detectYesNo(afterLabel);
      if (inline) return inline;

      const nextLine = lines.slice(index + 1).find((candidate) => candidate.length > 0);
      if (nextLine) {
        const next = detectYesNo(nextLine);
        if (next) return next;
      }
    }
  }

  return "";
};

const MEDICAL_CONDITIONS = [
  "High Blood Pressure",
  "Low Blood Pressure",
  "Epilepsy / Convulsions",
  "AIDS or HIV Infection",
  "Sexually Transmitted Disease",
  "Stomach Troubles / Ulcers",
  "Fainting Seizures",
  "Rapid Weight Loss",
  "Recent Weight Loss",
  "Joint Replacement / Implant",
  "Heart Attack",
  "Thyroid Problem",
  "Heart Disease",
  "Heart Murmur",
  "Hepatitis / Liver Disease",
  "Rheumatic Fever",
  "Hay fever / Allergies",
  "Respiratory Problems",
  "Hepatitis / Jaundice",
  "Tuberculosis",
  "Swollen ankles",
  "Kidney Disease",
  "Diabetes",
  "Chest pain",
  "Stroke",
  "Cancer / Tumors",
  "Anemia",
  "Angina",
  "Asthma",
  "Emphysema",
  "Bleeding Problems",
  "Blood diseases",
  "Head injuries",
  "Arthritis / Rheumatism",
];

const ALLERGY_OPTIONS = [
  "Local Anesthetic (ex. Lidocaine)",
  "Penicillin, Antibiotics",
  "Sulfa drugs",
  "Aspirin",
  "Latex",
];

const findCheckedItems = (text: string, options: string[]): string[] =>
  options.filter((option) => {
    const escaped = escapeRegExp(option);
    // The mark has to sit on the same line as the label, right next to it. A mark
    // on a neighbouring line belongs to a different option.
    const markedBefore = new RegExp(`${CHECK_MARK}[ \\t]{0,3}${escaped}`, "i");
    const markedAfter = new RegExp(`${escaped}[ \\t]{0,6}${CHECK_MARK}`, "i");
    const labelledYes = new RegExp(`${escaped}[ \\t]*[:\\-]?[ \\t]*y(?:es)?\\b`, "i");
    return markedBefore.test(text) || markedAfter.test(text) || labelledYes.test(text);
  });

const parseVisits = (text: string): ParsedVisit[] => {
  const visits: ParsedVisit[] = [];
  const visitSection = text.match(
    /(?:visit(?:s)? history|treatment(?:\s+record)?|dental chart|procedure(?:s)?|clinical notes)[:\s]*([\s\S]*)/i
  );
  const source = visitSection?.[1] ?? text;

  const linePatterns = [
    /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s*[-–:]\s*(.+?)(?:\s*[-–|]\s*(?:₱|php)?\s*([\d,]+(?:\.\d{1,2})?))?$/i,
    /(?:date|visited?)\s*[:-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}).*?(?:treatment|procedure)\s*[:-]?\s*([^\n]+?)(?:\s*(?:cost|amount|fee)\s*[:-]?\s*(?:₱|php)?\s*([\d,]+(?:\.\d{1,2})?))?/i,
  ];

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 8) continue;

    for (const pattern of linePatterns) {
      const match = trimmed.match(pattern);
      if (!match) continue;

      const visitDate = parseDateToIso(match[1]);
      if (!visitDate) continue;

      const treatmentText = (match[2] ?? "").trim();
      const cost = match[3] ? extractAmount(match[3]) : extractAmount(trimmed);

      visits.push({
        visit_date: visitDate,
        diagnosis: "",
        treatment: treatmentText,
        treatment_cost: cost,
        notes: trimmed,
      });
      break;
    }
  }

  // Tabular records often put the date and the treatment on separate lines.
  // Only used inside a detected visit section so dates elsewhere are ignored.
  if (visits.length === 0 && visitSection) {
    const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
    const dateOnly = /^(?:[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})$/;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line.length < 6) continue;
      const dateMatch = line.match(dateOnly);
      const visitDate = dateMatch ? parseDateToIso(dateMatch[0]) : "";
      if (!visitDate) continue;

      const treatmentLine = lines
        .slice(index + 1, index + 3)
        .find((candidate) => /[A-Za-z]{3,}/.test(candidate) && !dateOnly.test(candidate));
      if (!treatmentLine) continue;

      visits.push({
        visit_date: visitDate,
        diagnosis: "",
        treatment: treatmentLine,
        treatment_cost: extractAmount(treatmentLine),
        notes: `${line} ${treatmentLine}`,
      });
      index += 1;
    }
  }

  const deduped = new Map<string, ParsedVisit>();
  for (const visit of visits) {
    const key = `${visit.visit_date}|${visit.treatment}`;
    if (!deduped.has(key)) deduped.set(key, visit);
  }

  return Array.from(deduped.values()).sort((a, b) =>
    a.visit_date.localeCompare(b.visit_date)
  );
};

export const parsePatientRecordText = (rawText: string): ParsedPatientRecord => {
  const text = normalizeText(rawText);
  const { first_name, last_name, gender: nameGender } = extractNameParts(text);
  const gender = nameGender || extractGenderFromText(text);

  const patient: Record<string, string | string[]> = {
    first_name,
    last_name,
    email: extractEmail(text),
    phone: extractPhone(text),
    date_of_birth: extractDateFromText(text),
    age: extractLabelValue(text, ["age"]).replace(/[^\d]/g, ""),
    occupation: extractLabelValue(text, ["occupation", "job", "work"]),
    marital_status: extractLabelValue(text, ["marital status", "civil status"]).toLowerCase(),
    address: extractLabelValue(text, ["address", "home address", "residence"]),
    emergency_contact_name: extractLabelValue(text, [
      "emergency contact",
      "emergency contact name",
      "contact person",
    ]),
    emergency_contact_phone: extractPhone(
      extractLabelValue(text, ["emergency phone", "emergency contact phone"])
    ),
    insurance_provider: extractLabelValue(text, ["insurance provider", "insurance", "hmo"]),
    insurance_policy_number: extractLabelValue(text, [
      "policy number",
      "insurance policy",
      "member id",
    ]),
    gender,
  };

  const medicalHistory: Record<string, string | string[]> = {
    physician_name: extractLabelValue(text, ["physician", "doctor", "name of physician"]),
    physician_specialty: extractLabelValue(text, ["specialty", "specialization"]),
    physician_address: extractLabelValue(text, ["physician address", "office address"]),
    physician_phone: extractPhone(extractLabelValue(text, ["physician phone", "office number"])),
    in_good_health: extractYesNo(text, ["in good health", "good health"]),
    in_medical_treatment: extractYesNo(text, [
      "in medical treatment",
      "under treatment",
    ]),
    treatment_condition: extractLabelValue(text, ["condition", "what condition"]),
    serious_illness: extractYesNo(text, ["serious illness", "surgical operation"]),
    illness_description: extractLabelValue(text, ["illness", "operation"]),
    hospitalized: extractYesNo(text, ["hospitalized"]),
    hospitalization_details: extractLabelValue(text, ["hospitalization", "when and why"]),
    taking_medication: extractYesNo(text, ["taking medication", "medication"]),
    medication_details: extractLabelValue(text, ["medication details", "please specify"]),
    uses_tobacco: extractYesNo(text, ["tobacco"]),
    uses_alcohol_drugs: extractYesNo(text, ["alcohol", "cocaine", "dangerous drugs"]),
    bleeding_time: extractLabelValue(text, ["bleeding time"]),
    blood_type: extractLabelValue(text, ["blood type"]),
    blood_pressure: extractLabelValue(text, ["blood pressure", "bp"]),
    is_pregnant: extractYesNo(text, ["pregnant"]),
    is_nursing: extractYesNo(text, ["nursing"]),
    taking_birth_control: extractYesNo(text, ["birth control", "contraceptive"]),
    other_allergy: extractLabelValue(text, ["other allergy", "other allergies"]),
    allergies: findCheckedItems(text, ALLERGY_OPTIONS),
    medical_conditions: findCheckedItems(text, MEDICAL_CONDITIONS),
  };

  return {
    patient,
    medicalHistory,
    visits: parseVisits(text),
    rawText: text,
  };
};
