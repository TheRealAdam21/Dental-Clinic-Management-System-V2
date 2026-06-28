import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Patient } from "@/types";
import jsPDF from "jspdf";

interface DentalCertificateGeneratorProps {
  patient: Patient;
}

const toothNumbers = {
  upper: ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  lower: ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"]
};
const toothOrder = [...toothNumbers.upper, ...toothNumbers.lower];

const DentalCertificateGenerator = ({ patient }: DentalCertificateGeneratorProps) => {
  const [title, setTitle] = useState("Mr.");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [services, setServices] = useState({
    scaling: false,
    filling: false,
    gingival: false,
    extraction: false,
    others: false
  });
  const [otherService, setOtherService] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

  const patientName = useMemo(() => `${patient.first_name} ${patient.last_name}`.trim(), [patient.first_name, patient.last_name]);

  const toggleService = (key: keyof typeof services) => {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]
    );
  };

  const formatLongDate = (rawDate: string) =>
    new Date(rawDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  const getOrderedTeeth = () => toothOrder.filter((tooth) => selectedTeeth.includes(tooth));

  const generateCertificateHtml = () => {
    const serviceLine = (checked: boolean, text: string) => `${checked ? "☑" : "☐"} ${text}`;
    const orderedTeeth = getOrderedTeeth();
    const upperSelected = toothNumbers.upper.filter((tooth) => orderedTeeth.includes(tooth)).join(" ");
    const lowerSelected = toothNumbers.lower.filter((tooth) => orderedTeeth.includes(tooth)).join(" ");
    const patientWithTitle = `${title} ${patientName}`.trim();
    const html = `
      <html>
      <head>
        <title>Dental Certificate</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body {
            font-family: "Times New Roman", serif;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .paper {
            width: 100%;
            max-width: 794px;
            min-height: 1123px;
            box-sizing: border-box;
            margin: 0 auto;
            padding: 56px 72px;
            border: 1px solid #555;
          }
          .clinic {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 30px;
            letter-spacing: 0.3px;
            color: #0f3b74;
            margin: 0;
            font-weight: 500;
          }
          .clinic-line {
            border-top: 2px solid #5b8fd6;
            margin: 8px 0 14px;
          }
          p { margin: 0 0 10px; line-height: 1.35; font-size: 20px; }
          .title { margin-top: 36px; font-weight: 700; font-family: Arial, Helvetica, sans-serif; font-size: 25px; color: #0f2d59; }
          .label { margin-bottom: 4px; font-weight: 700; }
          .services p { margin: 0 0 9px; }
          .teeth-line { margin: 2px 0; }
          .footer {
            margin-top: 56px;
            display: flex;
            justify-content: space-between;
          }
          .sign { width: 45%; text-align: center; }
          .sign p { margin-bottom: 8px; }
          .sign .role { font-weight: 700; }
          .sign .prc { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="paper">
          <h1 class="clinic">TANGLAO DENTAL CLINIC</h1>
          <div class="clinic-line"></div>
          <p>MacArthur Hi-Way, Sto. Domingo I, Capas, Tarlac</p>
          <p>Tel. No.: 045-493-3454</p>
          <p>Cell No.: 0928-9950-488</p>

          <p class="title">CERTIFICATE OF DENTAL TREATMENT</p>
          <p class="label">Date: ${formatLongDate(date)}</p>
          <p>To Whom It May Concern:</p>
          <p>This is to certify that ${patientWithTitle} has undergone dental treatment and received the following services:</p>

          <div class="services">
          <p>${serviceLine(services.scaling, "Thorough scaling and polishing")}</p>
          <p>${serviceLine(services.filling, "Tooth filling as indicated below:")}</p>
          ${services.filling ? `
            <p class="teeth-line">${upperSelected || toothNumbers.upper.join(" ")}</p>
            <p class="teeth-line">${lowerSelected || toothNumbers.lower.join(" ")}</p>
          ` : ""}
          <p>${serviceLine(services.gingival, "Gingival / Periodontal Treatment")}</p>
          <p>${serviceLine(services.extraction, "Tooth Extraction")}</p>
          <p>${serviceLine(services.others, `Others: ${otherService || "-"}`)}</p>
          </div>

          <p>This certification is issued upon the request of the above-named patient for whatever purpose it may serve.</p>

          <div class="footer">
            <div class="sign">
              <p>Dr. Naomi Tanglao-Cortez</p>
              <p class="role">Dentist</p>
              <p class="prc">PRC # 40879</p>
            </div>
            <div class="sign">
              <p>Dr. Adonis E. Cortez</p>
              <p class="role">Dentist</p>
              <p class="prc">PRC # 37378</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 78;
    let y = 80;
    const pageWidth = doc.internal.pageSize.getWidth();
    const right = pageWidth - left;
    const pageHeight = doc.internal.pageSize.getHeight();
    const clinicBlue = "#0f3b74";
    const headerLineBlue = "#5b8fd6";

    const writeCenter = (text: string, fontSize = 12, bold = false) => {
      doc.setFont("times", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.text(text, pageWidth / 2, y, { align: "center" });
      y += fontSize + 6;
    };

    const writeLeft = (text: string, fontSize = 12, bold = false) => {
      doc.setFont("times", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.text(text, left, y);
      y += fontSize + 6;
    };

    doc.setDrawColor(80, 80, 80);
    doc.rect(16, 16, pageWidth - 32, doc.internal.pageSize.getHeight() - 32);

    doc.setTextColor(clinicBlue);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(24);
    doc.text("TANGLAO DENTAL CLINIC", left, y);
    y += 8;
    doc.setDrawColor(headerLineBlue);
    doc.setLineWidth(1);
    doc.line(left, y, right, y);
    y += 18;

    doc.setTextColor("#000000");
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text("MacArthur Hi-Way, Sto. Domingo I, Capas, Tarlac", left, y);
    y += 17;
    doc.text("Tel. No.: 045-493-3454", left, y);
    y += 17;
    doc.text("Cell No.: 0928-9950-488", left, y);
    y += 42;

    doc.setFont("helvetica", "bold");
    doc.setTextColor("#0f2d59");
    doc.setFontSize(17);
    doc.text("CERTIFICATE OF DENTAL TREATMENT", left, y);
    y += 18;

    doc.setTextColor("#000000");
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(`Date: ${formatLongDate(date)}`, left, y);
    y += 18;

    doc.setFont("times", "normal");
    writeLeft("To Whom It May Concern:", 12, false);
    const wrappedIntro = doc.splitTextToSize(
      `This is to certify that ${`${title} ${patientName}`.trim()} has undergone dental treatment and received the following services:`,
      right - left
    );
    doc.text(wrappedIntro, left, y);
    y += wrappedIntro.length * 15 + 4;

    const checkboxLine = (checked: boolean, text: string) => `${checked ? "☑" : "☐"} ${text}`;
    writeLeft(checkboxLine(services.scaling, "Thorough scaling and polishing"), 12, false);
    writeLeft(checkboxLine(services.filling, "Tooth filling as indicated below:"), 12, false);
    if (services.filling) {
      const orderedTeeth = getOrderedTeeth();
      const upperLine = toothNumbers.upper.filter((tooth) => orderedTeeth.includes(tooth)).join(" ") || toothNumbers.upper.join(" ");
      const lowerLine = toothNumbers.lower.filter((tooth) => orderedTeeth.includes(tooth)).join(" ") || toothNumbers.lower.join(" ");
      writeLeft(upperLine, 11, false);
      writeLeft(lowerLine, 11, false);
    }
    writeLeft(checkboxLine(services.gingival, "Gingival / Periodontal Treatment"), 12, false);
    writeLeft(checkboxLine(services.extraction, "Tooth Extraction"), 12, false);
    writeLeft(checkboxLine(services.others, `Others: ${otherService || "-"}`), 12, false);

    y += 12;
    const wrappedOutro = doc.splitTextToSize(
      "This certification is issued upon the request of the above-named patient for whatever purpose it may serve.",
      right - left
    );
    doc.text(wrappedOutro, left, y);

    const footerY = Math.min(y + 72, pageHeight - 148);
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text("Dr. Naomi Tanglao-Cortez", left, footerY);
    doc.text("Dr. Adonis E. Cortez", right - 130, footerY);
    doc.setFont("times", "bold");
    doc.text("Dentist", left + 30, footerY + 24);
    doc.text("Dentist", right - 92, footerY + 24);
    doc.text("PRC # 40879", left + 20, footerY + 48);
    doc.text("PRC # 37378", right - 102, footerY + 48);

    const safeName = patientName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    doc.save(`dental-certificate_${safeName}_${date}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dental Certificate Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="patient_name">Patient Name</Label>
              <Input id="patient_name" value={patientName} disabled />
            </div>
            <div>
              <Label htmlFor="cert_date">Date</Label>
              <Input id="cert_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Services Provided</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Checkbox checked={services.scaling} onCheckedChange={() => toggleService("scaling")} /> Thorough scaling and polishing</div>
              <div className="flex items-center gap-2"><Checkbox checked={services.filling} onCheckedChange={() => toggleService("filling")} /> Tooth filling</div>
              <div className="flex items-center gap-2"><Checkbox checked={services.gingival} onCheckedChange={() => toggleService("gingival")} /> Gingival / Periodontal Treatment</div>
              <div className="flex items-center gap-2"><Checkbox checked={services.extraction} onCheckedChange={() => toggleService("extraction")} /> Tooth Extraction</div>
              <div className="flex items-center gap-2"><Checkbox checked={services.others} onCheckedChange={() => toggleService("others")} /> Others</div>
            </div>
            {services.others && (
              <Input value={otherService} onChange={(e) => setOtherService(e.target.value)} placeholder="Specify other treatment" />
            )}
          </div>

          {services.filling && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tooth Selection for Filling</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTeeth([])}>
                  Clear All
                </Button>
              </div>
              <div className="bg-slate-50 border rounded p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Upper Teeth</p>
                  <div className="grid grid-cols-8 gap-2">
                    {toothNumbers.upper.map((tooth) => (
                      <Button
                        key={tooth}
                        type="button"
                        variant={selectedTeeth.includes(tooth) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTooth(tooth)}
                      >
                        {tooth}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Lower Teeth</p>
                  <div className="grid grid-cols-8 gap-2">
                    {toothNumbers.lower.map((tooth) => (
                      <Button
                        key={tooth}
                        type="button"
                        variant={selectedTeeth.includes(tooth) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTooth(tooth)}
                      >
                        {tooth}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={generateCertificateHtml}>
              Print Certificate
            </Button>
            <Button type="button" onClick={downloadPdf}>
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DentalCertificateGenerator;
