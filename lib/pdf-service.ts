import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPEN ---
export interface PDFBranding {
  logoUrl?: string; // Das editierbare Firmenlogo
  slogan?: string;  // Der editierbare Slogan
  footerText?: string; // Die editierbaren Firmeninfos
}

export interface PDFData {
  title: string;
  ferrataName: string;
  technicianName: string;
  date: string;
  content: {
    report?: string;
    material?: string;
    time?: string;
    location?: string;
    images?: string[];
  };
}

// --- HELPER: Sicherer Bild-Konverter ---
const getBase64Image = async (url: string): Promise<{base64: string, width: number, height: number} | null> => {
  if (!url || url.trim() === "") return null;
  
  try {
    // FEHLERBEHEBUNG LOGO: Wir müssen sicherstellen, dass die URL absolut ist.
    // Wenn die URL mit "/" beginnt, ist es ein lokales Bild im public Ordner.
    // Wir fügen window.location.origin hinzu, damit fetch() funktioniert.
    const finalUrl = url.startsWith('/') ? window.location.origin + url : url;
    
    const res = await fetch(finalUrl, { mode: 'cors' });
    if (!res.ok) throw new Error("Fetch fehlgeschlagen");

    const blob = await res.blob();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = URL.createObjectURL(blob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const data = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(img.src);
        resolve({ base64: data, width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("PDF-Service: Bild konnte nicht geladen werden:", url, e);
    return null;
  }
};

// --- MODUL: HEADER (Firmenlogo links, Slogan rechts) ---
// --- MODUL: HEADER (Großes Logo & 2-zeiliger Slogan) ---
const drawHeader = async (doc: jsPDF, branding: PDFBranding, title: string) => {
  let headerBottom = 30;

  // 1. Firmenlogo (Links) - Jetzt auf 45mm vergrößert
  if (branding.logoUrl) {
    const imgData = await getBase64Image(branding.logoUrl);
    if (imgData) {
      const logoWidth = 55; // Vergrößert von 35 auf 45
      const logoHeight = (imgData.height * logoWidth) / imgData.width;
      doc.addImage(imgData.base64, 'JPEG', 14, 15, logoWidth, logoHeight);
      headerBottom = Math.max(headerBottom, 15 + logoHeight);
    }
  }

  // 2. Zwei-zeiliger Slogan (Rechts oben)
  if (branding.slogan) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(160);

    // Wir splitten den Slogan bei einem Trennzeichen, z.B. "|" oder "\n"
    // Falls kein Trenner da ist, schreiben wir ihn einfach in die erste Zeile
    const sloganLines = branding.slogan.split('|').map(s => s.trim());
    
    // Erste Slogan-Zeile
    doc.text(sloganLines[0] || "", 196, 26, { align: 'right' });
    
    // Zweite Slogan-Zeile (falls vorhanden)
    if (sloganLines[1]) {
      doc.text(sloganLines[1], 196, 30, { align: 'right' });
    }
  }

  // 3. Dokumententitel (Y-Position dynamisch nach Logo-Größe)
  const titleY = Math.max(55, headerBottom + 10);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, titleY);
  
  return titleY + 10; // Neuer Y-Offset für die Stammdaten-Tabelle
};

// --- MODUL: FOOTER (Stabilisiertes 2-Zeilen-Layout) ---
const drawFooter = (doc: jsPDF, branding: PDFBranding) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Wir setzen den Footer etwas höher an, damit zwei Zeilen gut Platz haben
    const footerY = 282; 

    // 1. Trennlinie (Dezent über die gesamte Breite)
    doc.setDrawColor(240);
    doc.setLineWidth(0.2);
    doc.line(14, footerY - 2, 196, footerY - 2);

    doc.setFontSize(8);

    // --- ZEILE 1: FIRMENINFOS (zentriert) & SEITENZAHL (links) ---
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    
    // Seitenzahl ganz links
    doc.text(`${i} / ${pageCount}`, 14, footerY + 3, { align: 'left' });

    // Firmeninfos des Technikers zentriert
    // Falls hier auch ein "|" verwendet wird, machen wir daraus eine Zeile
    const info = (branding.footerText || "").replace('|', ' • ');
    doc.text(info, 105, footerY + 3, { align: 'center' });


    // --- ZEILE 2: BRANDING (Rechtsbündig darunter) ---
    const brandingY = footerY + 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180);
    const brandingText = "generiert mit ";
    const mainBrand = "ferrata.report";
    
    const mainBrandWidth = doc.getTextWidth(mainBrand);
    const brandingTextWidth = doc.getTextWidth(brandingText);
    const totalBrandingWidth = mainBrandWidth + brandingTextWidth;

    // "generiert mit" Text (Positioniert basierend auf der Gesamtbreite beider Teile)
    doc.text(brandingText, 196 - totalBrandingWidth, brandingY);
    
    // "ferrata.report" in Blau & Fett
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(mainBrand, 196 - mainBrandWidth, brandingY);
  }
};

const drawImageGrid = async (doc: jsPDF, images: string[] | undefined) => {
  if (!images || images.length === 0) return;

  doc.addPage();
  
  const margin = 14;
  const gap = 15; // Abstand zwischen Bild 1 und Bild 2
  const maxImageBottomY = 270; // Harte Grenze vor dem Footer
  const availableWidth = 182;
  
  // Wir berechnen den Platz für GENAU zwei Bilder.
  // (Maximaler Platz - Start-Abstand oben - Lücke zwischen Bildern) / 2
  const fixedHeightPerImage = (maxImageBottomY - 40 - gap) / 2; // Ca. 107mm pro Bild

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text("Fotodokumentation", margin, 22);

  let currentY = 32; 
  let currentImageInPage = 0;

  for (let i = 0; i < images.length; i++) {
    const imgData = await getBase64Image(images[i]);
    if (!imgData) continue;

    // Seitenumbruch erzwingen, wenn das dritte Bild kommt
    if (currentImageInPage === 2) {
      doc.addPage();
      currentY = 20; 
      currentImageInPage = 0;
    }

    const ratio = imgData.width / imgData.height;
    
    // STRATEGIE: Wir füllen erst die Höhe aus, damit zwei Bilder sicher passen,
    // und schauen dann, ob die Breite den Rand sprengt.
    let pH = fixedHeightPerImage;
    let pW = fixedHeightPerImage * ratio;

    // Falls das Bild (z.B. ein extrem breites Panorama) nun über den Seitenrand geht
    if (pW > availableWidth) {
      pW = availableWidth;
      pH = availableWidth / ratio;
    }

    // Zentrierung auf der X-Achse
    const x = margin + (availableWidth - pW) / 2;

    // Bild zeichnen
    doc.addImage(imgData.base64, 'JPEG', x, currentY, pW, pH);
    
    // Bild-Beschriftung
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160);
    doc.text(`Bild ${i + 1}`, margin, currentY + pH + 5);

    // Y-Position für das nächste Bild (Bild 1 -> Bild 2)
    currentY += pH + gap + 8; 
    currentImageInPage++;
  }
};
// --- TEMPLATE: SAMMEL-PROTOKOLL (Wartungsbuch) ---
export const generateMultiRepairPDF = async (branding: PDFBranding, repairs: PDFData[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  for (let index = 0; index < repairs.length; index++) {
    const data = repairs[index];
    
    // Neue Seite für jede Reparatur (außer bei der ersten)
    if (index > 0) doc.addPage();

    // 1. Header (Titel: "Wartungsprotokoll - [Name]")
    let currentY = await drawHeader(doc, branding, data.title);
    
    // 2. Stammdaten
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Anlage:', data.ferrataName],
        ['Techniker:', data.technicianName],
        ['Datum:', data.date],
        ['Ort:', data.content.location || '-']
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 3. Bericht
    autoTable(doc, {
      startY: currentY,
      head: [['Technischer Bericht & Maßnahmen']],
      body: [[data.content.report || '-']],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 4. Material & Zeit
    autoTable(doc, {
      startY: currentY,
      head: [['Materialeinsatz', 'Zeitaufwand']],
      body: [[data.content.material || '-', data.content.time || '-']],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] }
    });

    // 5. Bilder direkt nach der jeweiligen Reparatur
    if (data.content.images && data.content.images.length > 0) {
      // Da drawImageGrid bereits doc.addPage() aufruft, 
      // hängen die Bilder einfach als neue Seiten dran
      await drawImageGrid(doc, data.content.images);
    }
  }

  // 6. Footer ganz am Ende über alle Seiten stempeln
  drawFooter(doc, branding);

  doc.save(`Wartungsbuch_Export_${new Date().toLocaleDateString('de-DE')}.pdf`);
};


// --- EXPORT TEMPLATE: REPARATURBERICHT ---
export const generateRepairPDF = async (branding: PDFBranding, data: PDFData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  let currentY = await drawHeader(doc, branding, data.title);
  
  autoTable(doc, {
    startY: currentY,
    body: [
      ['Klettersteig:', data.ferrataName],
      ['Techniker:', data.technicianName],
      ['Datum:', data.date],
      ['Ort:', data.content.location || '-']
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  autoTable(doc, {
    startY: currentY,
    head: [['Technischer Bericht & Maßnahmen']],
    body: [[data.content.report || '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], font: 'helvetica' },
    styles: { fontSize: 10, font: 'helvetica' }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: currentY,
    head: [['Materialeinsatz', 'Zeitaufwand']],
    body: [[data.content.material || '-', data.content.time || '-']],
    theme: 'grid',
    headStyles: { fillColor: [100, 100, 100], font: 'helvetica' },
    styles: { fontSize: 9, font: 'helvetica' }
  });

// 5. Bilder (Startet jetzt automatisch auf neuer Seite)
  if (data.content.images && data.content.images.length > 0) {
    await drawImageGrid(doc, data.content.images);
  }

  // 6. Footer (Ganz am Ende über alle Seiten stempeln)
  drawFooter(doc, branding);

  doc.save(`Bericht_${data.ferrataName.replace(/\s+/g, '_')}_${data.date}.pdf`);
};