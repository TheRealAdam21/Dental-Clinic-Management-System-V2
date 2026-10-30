import { describe, expect, it } from "vitest";
import { parsePatientRecordText } from "@/lib/recordParser";

describe("recordParser", () => {
  it("extracts a plain two-word name from OCR text", () => {
    const parsed = parsePatientRecordText("Adam Cortez\nsome other line");

    expect(parsed.patient.first_name).toBe("Adam");
    expect(parsed.patient.last_name).toBe("Cortez");
  });

  it("extracts labeled patient names", () => {
    const parsed = parsePatientRecordText("Patient Name: Maria Santos");

    expect(parsed.patient.first_name).toBe("Maria");
    expect(parsed.patient.last_name).toBe("Santos");
  });

  it("extracts comma-separated names", () => {
    const parsed = parsePatientRecordText("Name: Santos, Maria");

    expect(parsed.patient.first_name).toBe("Maria");
    expect(parsed.patient.last_name).toBe("Santos");
  });

  it("extracts patient card data from noisy UI screenshot OCR", () => {
    const parsed = parsePatientRecordText(`
= Patient Records
Search patients by name, email. or phone...
& Adam Cortez male
Ss 09611734377
8 7/14/2006
2) X-rays a) Certificate View Reco,
    `);

    expect(parsed.patient.first_name).toBe("Adam");
    expect(parsed.patient.last_name).toBe("Cortez");
    expect(parsed.patient.phone).toBe("09611734377");
    expect(parsed.patient.date_of_birth).toBe("2006-07-14");
    expect(parsed.patient.gender).toBe("male");
  });

  it("reads values printed on the line under the label", () => {
    const parsed = parsePatientRecordText(`
Patient Name:
Maria Santos
Phone:
0917 123 4567
Address:
12 Mabini Street, Cebu City
    `);

    expect(parsed.patient.first_name).toBe("Maria");
    expect(parsed.patient.last_name).toBe("Santos");
    expect(parsed.patient.phone).toBe("09171234567");
    expect(parsed.patient.address).toBe("12 Mabini Street, Cebu City");
  });

  it("reads yes/no answers with a checked box", () => {
    const parsed = parsePatientRecordText(`
Are you in good health? ☑ Yes ☐ No
Do you use tobacco products? ☐ Yes ☐ No
Have you ever been hospitalized?
☑ Yes ☐ No
    `);

    expect(parsed.medicalHistory.in_good_health).toBe("yes");
    expect(parsed.medicalHistory.uses_tobacco).toBe("");
    expect(parsed.medicalHistory.hospitalized).toBe("yes");
  });

  it("does not treat an unmarked Yes/No pair as an answer", () => {
    const parsed = parsePatientRecordText("Are you in medical treatment now? Yes No");

    expect(parsed.medicalHistory.in_medical_treatment).toBe("");
  });

  it("detects checked allergy boxes", () => {
    const parsed = parsePatientRecordText(`
Allergies:
☐ Local Anesthetic (ex. Lidocaine)
☐ Penicillin, Antibiotics
[x] Latex
    `);

    expect(parsed.medicalHistory.allergies).toEqual(["Latex"]);
  });

  it("ignores the page separator on multi-page scans", () => {
    const parsed = parsePatientRecordText(`
Dental Clinic

--- PAGE BREAK ---

Maria Santos
09171234567
    `);

    expect(parsed.patient.first_name).toBe("Maria");
    expect(parsed.patient.last_name).toBe("Santos");
  });

  it("pairs a date with the treatment printed below it", () => {
    const parsed = parsePatientRecordText(`
Visit History
07/14/2025
Cleaning
08/02/2025
Filling
    `);

    expect(parsed.visits).toHaveLength(2);
    expect(parsed.visits[0]).toMatchObject({ visit_date: "2025-07-14", treatment: "Cleaning" });
    expect(parsed.visits[1]).toMatchObject({ visit_date: "2025-08-02", treatment: "Filling" });
  });
});
