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

const normalizeText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

const extractLabelValue = (text: string, labels: string[]): string => {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:\\-–]?\\s*([^\\n]+)`,
      "i"
    );
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
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

  const match = text.match(/(?:\+63|0)?9\d{9}|(?:\+63|0)?\d{10,11}/);
  return match?.[0]?.replace(/[^\d+]/g, "") ?? "";
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

  const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    let [, part1, part2, year] = slashMatch;
    if (year.length === 2) year = `20${year}`;
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

const extractNameParts = (text: string): { first_name: string; last_name: string } => {
  const fullName = extractLabelValue(text, [
    "patient name",
    "name of patient",
    "full name",
    "name",
  ]);

  if (!fullName) return { first_name: "", last_name: "" };

  if (fullName.includes(",")) {
    const [last, first] = fullName.split(",").map((part) => part.trim());
    return { first_name: first ?? "", last_name: last ?? "" };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
};

const extractAmount = (value: string): number | null => {
  const match = value.match(/(?:₱|php|peso)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match?.[1]) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
};

const yesNoFromText = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (/^(yes|y|true|checked|✓|x)$/.test(normalized)) return "yes";
  if (/^(no|n|false)$/.test(normalized)) return "no";
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
    const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}[^\\n]*(?:✓|x|yes|checked)`, "i");
    return pattern.test(text) || new RegExp(`(?:✓|x|☑)\\s*${escaped}`, "i").test(text);
  });

const parseVisits = (text: string): ParsedVisit[] => {
  const visits: ParsedVisit[] = [];
  const visitSection = text.match(
    /(?:visit(?:s)? history|treatment(?:\s+record)?|dental chart|procedure(?:s)?|clinical notes)[:\s]*([\s\S]*)/i
  );
  const source = visitSection?.[1] ?? text;

  const linePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[-–:]\s*(.+?)(?:\s*[-–|]\s*(?:₱|php)?\s*([\d,]+(?:\.\d{1,2})?))?$/i,
    /(?:date|visited?)\s*[:\\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}).*?(?:treatment|procedure)\s*[:\\-]?\s*([^\\n]+?)(?:\s*(?:cost|amount|fee)\s*[:\\-]?\s*(?:₱|php)?\s*([\d,]+(?:\.\d{1,2})?))?/i,
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
  const { first_name, last_name } = extractNameParts(text);

  const genderRaw = extractLabelValue(text, ["gender", "sex"]).toLowerCase();
  const gender = genderRaw.includes("f")
    ? "female"
    : genderRaw.includes("m")
      ? "male"
      : genderRaw.includes("other")
        ? "other"
        : "";

  const patient: Record<string, string | string[]> = {
    first_name,
    last_name,
    email: extractEmail(text),
    phone: extractPhone(text),
    date_of_birth: parseDateToIso(
      extractLabelValue(text, ["date of birth", "dob", "birth date", "birthdate"])
    ),
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
    in_good_health: yesNoFromText(extractLabelValue(text, ["in good health", "good health"])),
    in_medical_treatment: yesNoFromText(
      extractLabelValue(text, ["in medical treatment", "under treatment"])
    ),
    treatment_condition: extractLabelValue(text, ["condition", "what condition"]),
    serious_illness: yesNoFromText(
      extractLabelValue(text, ["serious illness", "surgical operation"])
    ),
    illness_description: extractLabelValue(text, ["illness", "operation"]),
    hospitalized: yesNoFromText(extractLabelValue(text, ["hospitalized"])),
    hospitalization_details: extractLabelValue(text, ["hospitalization", "when and why"]),
    taking_medication: yesNoFromText(extractLabelValue(text, ["taking medication", "medication"])),
    medication_details: extractLabelValue(text, ["medication details", "please specify"]),
    uses_tobacco: yesNoFromText(extractLabelValue(text, ["tobacco"])),
    uses_alcohol_drugs: yesNoFromText(
      extractLabelValue(text, ["alcohol", "cocaine", "dangerous drugs"])
    ),
    bleeding_time: extractLabelValue(text, ["bleeding time"]),
    blood_type: extractLabelValue(text, ["blood type"]),
    blood_pressure: extractLabelValue(text, ["blood pressure", "bp"]),
    is_pregnant: yesNoFromText(extractLabelValue(text, ["pregnant"])),
    is_nursing: yesNoFromText(extractLabelValue(text, ["nursing"])),
    taking_birth_control: yesNoFromText(
      extractLabelValue(text, ["birth control", "contraceptive"])
    ),
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
