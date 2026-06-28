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
});
