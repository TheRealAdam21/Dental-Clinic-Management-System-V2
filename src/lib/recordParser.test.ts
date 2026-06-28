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
});
