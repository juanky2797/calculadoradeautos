"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";

import { mimeToJsPdfFormat, normalizeImageUrl, type JsPdfImageFormat } from "@/lib/image";
import { calculateQuote, formatCurrency, type VehicleType } from "@/lib/quote";

const defaultConfig = {
  mainTitle: "Calculadora de Importación de Autos",
  subtitle: "Cotización completa de vehículos eléctricos a Panamá",
  companyName: "Shanghai Autos PTY",
  companyPhone: "6937-0170",
  companyAddress: "Centro Comercial Costa Sur - Local 28, Panamá",
  companyWebsite: "shanghai-autospty.com",
  logoUrl: "/logo.png",
} as const;

const pdfPalette = {
  primary: "#000000",
  secondary: "#0c0a0a",
} as const;

const sellerFooter = {
  name: "Wellview Universal S.A.",
  ruc: "R. U. C. 155665924-2-2018 DV 37",
  address: "Centro Comercial Costa Sur, Local 28, Juan Diaz, Ciudad de Panama, Panamá.",
  contact: "Teléfono: 385.2428",
} as const;

const defaultTermsText = `1. PRECIO:
• Gastos de gestión: 5% sobre el precio FOB del vehículo
• Arancel sobre CIF (FOB + accesorios + flete) según tipo de vehículo
  eléctrico 0% • híbrido 10% • combustión 25%
• Validez de precios: 15 días desde la fecha de emisión
• El flete marítimo varía según tamaño y disponibilidad de embarque
• Incluye: costo del producto, documentos de exportación, embalaje,
  despacho de aduana y gastos de salida en origen
• El seguro cubre solo el embalaje, no pérdida o daño de mercancía

2. CONDICIONES DE PAGO:
• 30% para reservar y confirmar la orden
• 70% antes del embarque
• Control de calidad según estándar AQL para cada envío
• Si el comprador no paga dentro de 30 días del informe de inspección
  aprobado, se perderá el depósito y se podrá revender la mercancía

3. RESPONSABILIDADES:
• El proveedor es responsable del despacho de aduana en origen
• El proveedor NO es responsable de daños o retrasos durante
  el transporte internacional

4. GARANTÍA Y RECLAMOS:
• Garantía: 2 años o 20,000 km (lo que ocurra primero)
• Cualquier reclamo debe hacerse directamente al proveedor dentro
  de 48 horas después de recibir el producto
• No hay garantías adicionales más allá de las contenidas en esta
  factura proforma

5. TRANSFERENCIAS INTERNACIONALES:
• El comprador debe enviar comprobante bancario y número Swift
• Si el banco beneficiario lo requiere, el comprador debe probar
  el origen de los fondos transferidos

6. LEY APLICABLE:
• Este acuerdo se rige por las leyes de Panamá
• Jurisdicción: tribunales competentes de Panamá`;

type Rgb = { r: number; g: number; b: number };
type PdfImage = { dataUrl: string; format: JsPdfImageFormat; width: number; height: number };

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function applyPdfHeader(
  doc: jsPDF,
  opts: {
    primary: Rgb;
    secondary: Rgb;
    companyName: string;
    companyWebsite: string;
    currentDate: string;
    logo: PdfImage | null;
  },
) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  const leftMargin = 20;
  const rightMargin = 20;
  const centerX = pageWidth / 2;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);

    if (opts.logo) {
      const maxWidth = 40;
      const maxHeight = 16;
      const scale = Math.min(maxWidth / opts.logo.width, maxHeight / opts.logo.height, 1);
      const width = opts.logo.width * scale;
      const height = opts.logo.height * scale;
      doc.addImage(opts.logo.dataUrl, opts.logo.format, leftMargin, 10, width, height);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(opts.primary.r, opts.primary.g, opts.primary.b);
    doc.text(opts.companyName, centerX, 18, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(opts.primary.r, opts.primary.g, opts.primary.b);
    doc.text("COTIZACIÓN DE IMPORTACIÓN", centerX, 27, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(opts.secondary.r, opts.secondary.g, opts.secondary.b);
    doc.text(`Fecha: ${opts.currentDate}`, pageWidth - rightMargin, 18, { align: "right" });

    doc.setDrawColor(opts.secondary.r, opts.secondary.g, opts.secondary.b);
    doc.setLineWidth(0.25);
    doc.line(leftMargin, 33, pageWidth - rightMargin, 33);
  }
}

function applyPdfFooter(doc: jsPDF, color: Rgb) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const leftMargin = 20;
  const rightMargin = 20;
  const footerStartY = pageHeight - 20;
  const lineHeight = 3.8;
  const centerX = pageWidth / 2;

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(color.r, color.g, color.b);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, footerStartY - 4.5, pageWidth - rightMargin, footerStartY - 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(color.r, color.g, color.b);

    doc.text(sellerFooter.name, centerX, footerStartY, { align: "center" });
    doc.text(sellerFooter.ruc, centerX, footerStartY + lineHeight, { align: "center" });
    doc.text(sellerFooter.address, centerX, footerStartY + lineHeight * 2, { align: "center" });
    doc.text(sellerFooter.contact, centerX, footerStartY + lineHeight * 3, { align: "center" });

    doc.text(`Página ${page} de ${pageCount}`, pageWidth - rightMargin, pageHeight - 6, { align: "right" });
  }
}

function buildWebsiteHref(website: string) {
  if (!website) return "#";
  if (website.startsWith("http://") || website.startsWith("https://")) return website;
  return `https://${website}/`;
}

export default function CarQuoteCalculator() {
  const [logoLoadError, setLogoLoadError] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [termsText, setTermsText] = useState(defaultTermsText);

  const [carModel, setCarModel] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("electric");
  const [carImage, setCarImage] = useState("");
  const [carImageFile, setCarImageFile] = useState<File | null>(null);
  const [carImageFilePreviewUrl, setCarImageFilePreviewUrl] = useState<string | null>(null);
  const [carImagePreviewError, setCarImagePreviewError] = useState(false);
  const [imageErrorMessage, setImageErrorMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [carDescription, setCarDescription] = useState("");
  const [carQuantity, setCarQuantity] = useState("1");
  const [carCost, setCarCost] = useState("");
  const [packingInfo, setPackingInfo] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [sellerComments, setSellerComments] = useState("");

  const [freight, setFreight] = useState("1300");
  const [portableCharger, setPortableCharger] = useState(false);
  const [residentialCharger, setResidentialCharger] = useState(false);
  const [extraChargers, setExtraChargers] = useState(0);
  const [additionalAccessoriesCost, setAdditionalAccessoriesCost] = useState("0");

  useEffect(() => {
    if (!carImageFile) {
      setCarImageFilePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(carImageFile);
    setCarImageFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [carImageFile]);

  const carCostNumber = Number.parseFloat(carCost) || 0;
  const carQuantityNumber = Number.parseInt(carQuantity, 10) || 1;
  const freightNumber = Number.parseFloat(freight) || 1300;
  const additionalAccessoriesCostNumber = Number.parseFloat(additionalAccessoriesCost) || 0;

  const totals = useMemo(() => {
    return calculateQuote({
      carCost: carCostNumber,
      carQuantity: carQuantityNumber,
      freight: freightNumber,
      portableCharger,
      residentialCharger,
      extraChargers,
      additionalAccessoriesCost: additionalAccessoriesCostNumber,
      vehicleType,
    });
  }, [
    carCostNumber,
    carQuantityNumber,
    freightNumber,
    portableCharger,
    residentialCharger,
    extraChargers,
    additionalAccessoriesCostNumber,
    vehicleType,
  ]);

  const quantityLabel = carQuantityNumber > 1 ? `(${carQuantityNumber} unidades)` : "";
  const vehicleTypeLabel =
    vehicleType === "electric" ? "Eléctrico" : vehicleType === "hybrid" ? "Híbrido" : "Combustión";
  const tariffRateLabel = `${Math.round(totals.tariffRate * 100)}%`;
  const canDownloadPdf = carCostNumber > 0;

  const normalizedCarImageUrl = useMemo(() => normalizeImageUrl(carImage), [carImage]);
  const imageUrlIsInvalid = carImage.trim() !== "" && !normalizedCarImageUrl && !carImageFile;

  const imagePreviewSrc = carImageFilePreviewUrl ?? normalizedCarImageUrl ?? null;
  const showImagePreview = Boolean(imagePreviewSrc) && !carImagePreviewError;

  const blobToDataUrl = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("File read failed"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  };

  const getImageDimensions = (dataUrl: string) => {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
  };

  const resolveImageForPdf = async () => {
    if (carImageFile) {
      const format = mimeToJsPdfFormat(carImageFile.type);
      if (!format) throw new Error("Unsupported image type");
      const dataUrl = await blobToDataUrl(carImageFile);
      const { width, height } = await getImageDimensions(dataUrl);
      return { dataUrl, format, width, height };
    }

    if (!normalizedCarImageUrl) return null;

    const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(normalizedCarImageUrl)}`);
    if (!response.ok) throw new Error("Image fetch failed");
    const blob = await response.blob();
    const format = mimeToJsPdfFormat(blob.type);
    if (!format) throw new Error("Unsupported image type");
    const dataUrl = await blobToDataUrl(blob);
    const { width, height } = await getImageDimensions(dataUrl);
    return { dataUrl, format, width, height };
  };

  const onDownloadPdf = async () => {
    if (!canDownloadPdf || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setImageErrorMessage(null);

	    try {
	      const doc = new jsPDF();

	      const primary = hexToRgb(pdfPalette.primary);
	      const secondary = hexToRgb(pdfPalette.secondary);
	      const contentStartY = 45;
	      const pageHeight = doc.internal.pageSize.getHeight();
	      const footerReserve = 34;
	      const maxContentY = pageHeight - footerReserve;

	      const currentDate = new Date().toLocaleDateString("es-PA", {
	        year: "numeric",
	        month: "long",
	        day: "numeric",
	      });

	      const companyName = defaultConfig.companyName;
	      const companyWebsite = defaultConfig.companyWebsite;

	      let logoForPdf: PdfImage | null = null;
	      try {
	        const logoUrl = defaultConfig.logoUrl;
	        const logoFetchUrl =
	          logoUrl.startsWith("http://") || logoUrl.startsWith("https://")
	            ? `/api/image-proxy?url=${encodeURIComponent(logoUrl)}`
	            : logoUrl;

	        const response = await fetch(logoFetchUrl);
	        if (response.ok) {
	          const blob = await response.blob();
	          const format = mimeToJsPdfFormat(blob.type);
	          if (format) {
	            const dataUrl = await blobToDataUrl(blob);
	            const { width, height } = await getImageDimensions(dataUrl);
	            logoForPdf = { dataUrl, format, width, height };
	          }
	        }
	      } catch {
	        // Ignore logo failures; the PDF still renders without it.
	      }

	      let yPos = contentStartY;

	      const ensureSpace = (height: number) => {
	        if (yPos + height > maxContentY) {
	          doc.addPage();
	          yPos = contentStartY;
	        }
	      };

	      const wrapText = (text: string, maxWidth: number) => {
	        const rawLines = String(text || "").split(/\r?\n/);
	        const wrapped: string[] = [];
	        rawLines.forEach((rawLine) => {
	          const line = rawLine.trimEnd();
	          if (!line) {
	            wrapped.push("");
	            return;
	          }
	          wrapped.push(...doc.splitTextToSize(line, maxWidth));
	        });
	        return wrapped.length > 0 ? wrapped : ["N/A"];
	      };

	      const renderInfoRows = (rows: Array<[string, string]>) => {
	        const labelX = 25;
	        const valueX = 70;
	        const valueWidth = 140;
	        const lineHeight = 6;

	        rows.forEach(([label, value]) => {
	          const lines = wrapText(value, valueWidth);
	          doc.setFont("helvetica", "bold");
	          ensureSpace(lineHeight);
	          doc.text(label, labelX, yPos);
	          doc.setFont("helvetica", "normal");

	          const firstLine = lines[0] ?? "";
	          if (firstLine) {
	            doc.text(firstLine, valueX, yPos);
	          }
	          yPos += lineHeight;

	          lines.slice(1).forEach((line) => {
	            ensureSpace(lineHeight);
	            if (line) {
	              doc.text(line, valueX, yPos);
	            }
	            yPos += lineHeight;
	          });
	        });
	      };

	      doc.setFontSize(14);
	      doc.setFont("helvetica", "bold");
	      doc.setTextColor(primary.r, primary.g, primary.b);
	      doc.text("INFORMACIÓN DEL CLIENTE", 20, yPos);

	      yPos += 10;
	      doc.setFontSize(11);
	      doc.setFont("helvetica", "normal");
	      doc.setTextColor(0, 0, 0);

	      const customerInfo: Array<[string, string]> = [
	        ["Nombre:", customerName || "No especificado"],
	        ["Cédula:", customerId || "No especificado"],
	        ["Correo:", customerEmail || "No especificado"],
	        ["Teléfono:", customerPhone || "No especificado"],
	      ];

	      renderInfoRows(customerInfo);
	      yPos += 8;

	    doc.setFontSize(14);
	    doc.setFont("helvetica", "bold");
	    doc.setTextColor(primary.r, primary.g, primary.b);
	    ensureSpace(10);
	    doc.text("INFORMACIÓN DEL VEHÍCULO", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const vehicleInfo: Array<[string, string]> = [
      ["Modelo:", carModel || "No especificado"],
      ["Tipo de Vehículo:", vehicleTypeLabel],
      ["Descripción:", carDescription || "N/A"],
      ["Cantidad:", carQuantityNumber.toString()],
      ["Precio Unitario (FOB):", formatCurrency(carCostNumber)],
      ["Precio Total (FOB):", formatCurrency(totals.totalCarCost)],
      ["Embalaje:", packingInfo || "No especificado"],
      ["Tiempo de Entrega:", deliveryTime || "No especificado"],
    ];

    renderInfoRows(vehicleInfo);

	    let insertedCarImage = false;
	    try {
	      const image = await resolveImageForPdf();
	      if (image) {
	        insertedCarImage = true;
	        const maxWidth = 170;
	        const maxHeight = 70;
	        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
	        const imgWidth = image.width * scale;
	        const imgHeight = image.height * scale;

	        const topSpacing = 8;
	        const bottomSpacing = 12;

		        if (yPos + topSpacing + imgHeight + bottomSpacing > maxContentY) {
		          doc.addPage();
		          yPos = contentStartY;
		        } else {
		          yPos += topSpacing;
		        }

	        const x = 105 - imgWidth / 2;
	        doc.addImage(image.dataUrl, image.format, x, yPos, imgWidth, imgHeight);
	        yPos += imgHeight + bottomSpacing;
	      }
	    } catch {
	      setImageErrorMessage("No se pudo incluir la imagen en el PDF. Se generó la cotización sin imagen.");
	    }

	    if (!insertedCarImage) {
	      yPos += 5;
	    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("DESGLOSE DE COSTOS", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const costs: Array<[string, string]> = [
      ["Costo Total del Auto (FOB)", formatCurrency(totals.totalCarCost)],
      ["Gastos de Gestión", formatCurrency(totals.commission)],
      ["Flete Marítimo (incluye seguro)", formatCurrency(totals.freight)],
    ];

    if (totals.portableCharger > 0) {
      costs.push(["Cargador Portátil", formatCurrency(30)]);
    }
    if (totals.residentialCharger > 0) {
      costs.push(["Cargador Residencial + Instalación", formatCurrency(300)]);
    }
    if (totals.extraChargersCost > 0) {
      costs.push([`Conjuntos Adicionales (${extraChargers})`, formatCurrency(totals.extraChargersCost)]);
    }
    if (totals.additionalAccessoriesCost > 0) {
      costs.push(["Accesorios adicionales", formatCurrency(totals.additionalAccessoriesCost)]);
    }

    costs.push([`Arancel (${tariffRateLabel} sobre CIF)`, formatCurrency(totals.tariff)]);
    costs.push(["Inspección Técnica", formatCurrency(250)]);
    costs.push(["Gastos de Llegada", formatCurrency(850)]);
    costs.push(["Registro y Placa", formatCurrency(260)]);

    costs.forEach(([label, value]) => {
      ensureSpace(7);
      doc.text(label, 25, yPos);
      doc.text(value, 180, yPos, { align: "right" });
      yPos += 7;
    });

    ensureSpace(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondary.r, secondary.g, secondary.b);
    doc.text(`Base CIF (FOB + accesorios + flete): ${formatCurrency(totals.cif)}`, 25, yPos);
    yPos += 6;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

	    ensureSpace(45);
	    yPos += 3;
	    doc.setDrawColor(secondary.r, secondary.g, secondary.b);
	    doc.line(20, yPos, 190, yPos);
	    yPos += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text("Subtotal", 25, yPos);
    doc.text(formatCurrency(totals.subtotal), 180, yPos, { align: "right" });

    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("ITBMS (7%)", 25, yPos);
    doc.text(formatCurrency(totals.tax), 180, yPos, { align: "right" });

	    yPos += 5;
	    doc.setDrawColor(primary.r, primary.g, primary.b);
	    doc.setLineWidth(0.4);
	    doc.rect(20, yPos, 170, 15, "S");
	    yPos += 10;
	    doc.setTextColor(primary.r, primary.g, primary.b);
	    doc.setFontSize(16);
	    doc.setFont("helvetica", "bold");
		    doc.text("TOTAL A PAGAR", 25, yPos);
		    doc.text(formatCurrency(totals.total), 180, yPos, { align: "right" });

	    yPos += 18;
	    doc.setTextColor(0, 0, 0);
	    doc.setFontSize(12);
	    doc.setFont("helvetica", "bold");
	    doc.setTextColor(primary.r, primary.g, primary.b);
	    doc.text("CONDICIONES DE PAGO", 20, yPos);

	    yPos += 8;
	    doc.setFontSize(10);
	    doc.setFont("helvetica", "bold");
	    doc.setTextColor(0, 0, 0);
	    doc.text(`30% para Reservar: ${formatCurrency(totals.deposit30)}`, 25, yPos);

	    yPos += 6;
	    doc.setFont("helvetica", "normal");
	    doc.text(`70% antes del Embarque: ${formatCurrency(totals.balance70)}`, 25, yPos);

		    if (sellerComments) {
		      yPos += 12;
		      doc.setFontSize(12);
		      doc.setFont("helvetica", "bold");
	      doc.setTextColor(primary.r, primary.g, primary.b);
	      doc.text("COMENTARIOS DEL VENDEDOR", 20, yPos);

      yPos += 8;
      doc.setFontSize(10);
	      doc.setFont("helvetica", "normal");
	      doc.setTextColor(0, 0, 0);
	      const commentLines = doc.splitTextToSize(sellerComments, 170);
	      commentLines.forEach((line: string) => {
	        ensureSpace(5);
	        doc.text(line, 25, yPos);
	        yPos += 5;
	      });
	    }

	    if (yPos > maxContentY - 30) {
	      doc.addPage();
	      yPos = contentStartY;
	    } else {
	      yPos += 12;
	    }

	    doc.setFontSize(12);
	    doc.setFont("helvetica", "bold");
	    doc.setTextColor(primary.r, primary.g, primary.b);
	    doc.text("INCLUYE:", 20, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("• Garantía de 2 años o 20,000 km (lo que ocurra primero)", 25, yPos);

    if (totals.portableCharger > 0) {
      yPos += 6;
      doc.text("• Cargador Portátil", 25, yPos);
    }
    if (totals.residentialCharger > 0) {
      yPos += 6;
      doc.text("• Cargador Residencial con Instalación", 25, yPos);
    }
	    if (extraChargers > 0) {
	      yPos += 6;
	      doc.text(
	        `• ${extraChargers} Conjunto${extraChargers > 1 ? "s" : ""} Adicional${extraChargers > 1 ? "es" : ""} de Cargadores`,
	        25,
	        yPos,
	      );
	    }

		    yPos += 14;

		    ensureSpace(24);
		    doc.setFontSize(12);
		    doc.setFont("helvetica", "bold");
		    doc.setTextColor(primary.r, primary.g, primary.b);
		    doc.text("TÉRMINOS Y CONDICIONES", 20, yPos);

		    yPos += 8;
		    doc.setFontSize(9);
		    doc.setFont("helvetica", "normal");
		    doc.setTextColor(0, 0, 0);

		    const termsLines = String(termsText || "").replace(/\r\n/g, "\n").split("\n");
		    const termsWidth = 167;
		    const sectionHeadingPattern = /^\s*\d+\.\s.*:\s*$/;

		    if (termsLines.every((line) => !line.trim())) {
		      ensureSpace(6);
		      doc.text("N/A", 23, yPos);
		      yPos += 4.5;
		    } else {
		      termsLines.forEach((rawLine) => {
		        const line = rawLine.trimEnd();
		        const trimmed = line.trim();

		        if (!trimmed) {
		          yPos += 3;
		          return;
		        }

		        if (sectionHeadingPattern.test(trimmed)) {
		          ensureSpace(8);
		          doc.setFont("helvetica", "bold");
		          doc.text(trimmed, 20, yPos);
		          yPos += 5;
		          doc.setFont("helvetica", "normal");
		          return;
		        }

		        const wrapped = wrapText(line, termsWidth);
		        wrapped.forEach((wrappedLine) => {
		          ensureSpace(6);
		          doc.text(wrappedLine, 23, yPos);
		          yPos += 4.5;
		        });
		      });
		    }

		    applyPdfHeader(doc, {
		      primary,
		      secondary,
		      companyName,
		      companyWebsite,
		      currentDate,
		      logo: logoForPdf,
		    });
		    applyPdfFooter(doc, secondary);

		    doc.save(`Cotizacion_${companyName.replace(/\\s+/g, "_")}_${Date.now()}.pdf`);
		    } finally {
		      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="calculator-wrapper">
      <div className="calculator-container">
        <header className="header">
          <div className="company-info">
            <div className="company-logo">
              {!logoLoadError ? (
                <img
                  src={defaultConfig.logoUrl}
                  alt="Shanghai Autos Logo"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                "SPTY"
              )}
            </div>
            <div className="company-details">
              <h2 className="company-name">{defaultConfig.companyName}</h2>
              <div className="company-contact">
                📍 <span>{defaultConfig.companyAddress}</span>
                <br />
                📞 <span>{defaultConfig.companyPhone}</span>
                <br />
                🌐{" "}
                <a
                  href={buildWebsiteHref(defaultConfig.companyWebsite)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {defaultConfig.companyWebsite}
                </a>
              </div>
            </div>
          </div>

          <h1>{defaultConfig.mainTitle}</h1>
          <p>{defaultConfig.subtitle}</p>
        </header>

        <main className="calculator-body">
          <div className="input-section">
            <h2 className="section-title">👤 Datos del Cliente</h2>

            <div className="input-group">
              <label htmlFor="customer-name">Nombre</label>
              <input
                type="text"
                id="customer-name"
                placeholder="Nombre y apellido"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="customer-id">Cédula</label>
              <input
                type="text"
                id="customer-id"
                placeholder="Ejemplo: 8-123-456"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="customer-email">Correo</label>
              <input
                type="email"
                id="customer-email"
                placeholder="correo@ejemplo.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="customer-phone">Teléfono</label>
              <input
                type="tel"
                id="customer-phone"
                placeholder="Ejemplo: 6000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">🚗 Datos del Vehículo</h2>

            <div className="input-group">
              <label htmlFor="car-model">Nombre del Modelo</label>
              <input
                type="text"
                id="car-model"
                placeholder="Ejemplo: BYD Seal 2024"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="vehicle-type">Tipo de Vehículo (Arancel)</label>
              <select
                id="vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              >
                <option value="electric">Eléctrico (0%)</option>
                <option value="hybrid">Híbrido (10%)</option>
                <option value="combustion">Combustión (25%)</option>
              </select>
              <div className="info-note info-note-compact">
                ℹ️ El arancel se calcula sobre CIF = FOB + accesorios + flete.
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="car-image">Imagen del Vehículo (URL)</label>
              <input
                type="text"
                id="car-image"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={carImage}
                onChange={(e) => {
                  setCarImage(e.target.value);
                  setCarImagePreviewError(false);
                  setImageErrorMessage(null);
                }}
              />

              <label htmlFor="car-image-file">Adjuntar imagen (archivo)</label>
              <input
                type="file"
                id="car-image-file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setImageErrorMessage("El archivo seleccionado no es una imagen.");
                    return;
                  }
                  setCarImageFile(file);
                  setCarImagePreviewError(false);
                  setImageErrorMessage(null);
                }}
              />

              {carImageFile ? (
                <div className="file-meta">
                  <span className="file-name">{carImageFile.name}</span>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => {
                      setCarImageFile(null);
                      setCarImagePreviewError(false);
                      setImageErrorMessage(null);
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ) : null}

              {imageUrlIsInvalid ? <div className="error-note">URL inválida. Usa un enlace completo (https://...)</div> : null}
              {imageErrorMessage ? <div className="error-note">{imageErrorMessage}</div> : null}

              {showImagePreview ? (
                <div className="image-preview">
                  <img
                    src={imagePreviewSrc ?? ""}
                    alt="Vista previa"
                    onError={() => {
                      setCarImagePreviewError(true);
                      setImageErrorMessage("No se pudo cargar la imagen. Verifica la URL o el archivo.");
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="input-group">
              <label htmlFor="car-description">Descripción del Vehículo</label>
              <textarea
                id="car-description"
                rows={4}
                placeholder="Características principales, color, especificaciones técnicas..."
                value={carDescription}
                onChange={(e) => setCarDescription(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="car-quantity">Cantidad</label>
              <input
                type="number"
                id="car-quantity"
                min={1}
                step={1}
                value={carQuantity}
                onChange={(e) => setCarQuantity(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="car-cost">Precio Unitario (USD FOB)</label>
              <input
                type="number"
                id="car-cost"
                placeholder="Ejemplo: 35000"
                min={0}
                step={100}
                value={carCost}
                onChange={(e) => setCarCost(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="packing-info">Información de Embalaje</label>
              <input
                type="text"
                id="packing-info"
                placeholder="Ejemplo: Contenedor 40' HC"
                value={packingInfo}
                onChange={(e) => setPackingInfo(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="delivery-time">Tiempo de Entrega</label>
              <input
                type="text"
                id="delivery-time"
                placeholder="Ejemplo: 45-60 días"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="seller-comments">Comentarios del Vendedor</label>
              <textarea
                id="seller-comments"
                rows={4}
                placeholder="Notas adicionales, promociones especiales, condiciones particulares..."
                value={sellerComments}
                onChange={(e) => setSellerComments(e.target.value)}
              />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">🚢 Costos de Importación</h2>

            <div className="input-group">
              <label htmlFor="freight">Flete Marítimo (incluye seguro) (USD)</label>
              <input
                type="number"
                id="freight"
                min={1300}
                max={2000}
                step={50}
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
              />
              <div className="range-display">
                <span>Desde: $1,300</span> <span>Hasta: $2,000</span>
              </div>
              <div className="info-note info-note-freight">ℹ️ El flete varía según tamaño del vehículo y disponibilidad</div>
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">📋 Costos Fijos</h2>

            <div className="input-group">
              <label>Inspección Técnica</label>
              <input type="number" value={250} readOnly className="readonly-input" />
            </div>

            <div className="input-group">
              <label>Gastos de Llegada (Puerto a Chilibre)</label>
              <input type="number" value={850} readOnly className="readonly-input" />
            </div>

            <div className="input-group">
              <label>Registro y Placa en Panamá</label>
              <input type="number" value={260} readOnly className="readonly-input" />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">🔌 Cargadores Opcionales</h2>

            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={portableCharger}
                onChange={(e) => setPortableCharger(e.target.checked)}
              />
              <span>Cargador Portátil ($30)</span>
            </label>

            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={residentialCharger}
                onChange={(e) => setResidentialCharger(e.target.checked)}
              />
              <span>Cargador Residencial + Instalación ($300)</span>
            </label>

            <div className="charger-counter">
              <button
                type="button"
                className="counter-btn"
                aria-label="Disminuir cargadores"
                onClick={() => setExtraChargers((n) => Math.max(0, n - 1))}
              >
                −
              </button>
              <div className="counter-value" aria-live="polite">
                {extraChargers}
              </div>
              <div className="counter-label">Conjuntos Adicionales de Cargadores ($330 c/u)</div>
              <button
                type="button"
                className="counter-btn"
                aria-label="Aumentar cargadores"
                onClick={() => setExtraChargers((n) => n + 1)}
              >
                +
              </button>
            </div>

            <div className="input-group">
              <label htmlFor="additional-accessories-cost">Accesorios adicionales (USD)</label>
              <input
                type="number"
                id="additional-accessories-cost"
                min={0}
                step={50}
                placeholder="Ejemplo: 500"
                value={additionalAccessoriesCost}
                onChange={(e) => setAdditionalAccessoriesCost(e.target.value)}
              />
            </div>
          </div>

          <div className="input-section">
            <h2 className="section-title">📄 Términos y Condiciones (PDF)</h2>

            <div className="input-group">
              <label htmlFor="terms-text">Editar términos</label>
              <textarea
                id="terms-text"
                rows={16}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
              />
              <button type="button" className="file-remove-btn" onClick={() => setTermsText(defaultTermsText)}>
                Restaurar por defecto
              </button>
              <div className="info-note info-note-compact">
                ℹ️ Se imprime tal cual en el PDF. Usa saltos de línea; los títulos tipo “1. …:” salen en negrita.
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3 className="summary-title">💰 Resumen de Costos</h3>

            <div className="cost-row">
              <span className="cost-label">
                Costo del Auto (FOB) <span>{quantityLabel}</span>
              </span>{" "}
              <span className="cost-value">{formatCurrency(totals.totalCarCost)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Gastos de Gestión</span>{" "}
              <span className="cost-value">{formatCurrency(totals.commission)}</span>
            </div>
            <div className="cost-row freight-cost-row">
              <span className="cost-label">Flete Marítimo (incluye seguro)</span>{" "}
              <span className="cost-value">{formatCurrency(totals.freight)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Inspección Técnica en Origen</span>{" "}
              <span className="cost-value">{formatCurrency(250)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Gastos de Llegada</span>{" "}
              <span className="cost-value">{formatCurrency(850)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Registro y Placa</span>{" "}
              <span className="cost-value">{formatCurrency(260)}</span>
            </div>

            {totals.portableCharger > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Cargador Portátil</span>{" "}
                <span className="cost-value">{formatCurrency(30)}</span>
              </div>
            ) : null}

            {totals.residentialCharger > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Cargador Residencial + Instalación</span>{" "}
                <span className="cost-value">{formatCurrency(300)}</span>
              </div>
            ) : null}

            {extraChargers > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Conjuntos Adicionales</span>{" "}
                <span className="cost-value">{formatCurrency(totals.extraChargersCost)}</span>
              </div>
            ) : null}

            {totals.additionalAccessoriesCost > 0 ? (
              <div className="cost-row">
                <span className="cost-label">Accesorios adicionales</span>{" "}
                <span className="cost-value">{formatCurrency(totals.additionalAccessoriesCost)}</span>
              </div>
            ) : null}

            <div className="cost-row">
              <span className="cost-label">Arancel ({tariffRateLabel} sobre CIF)</span>{" "}
              <span className="cost-value">{formatCurrency(totals.tariff)}</span>
            </div>
            <div className="cif-note">
              Base CIF (FOB + accesorios + flete): <strong>{formatCurrency(totals.cif)}</strong>
            </div>

            <div className="cost-row subtotal-row">
              <span className="cost-label">Subtotal</span> <span className="cost-value">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">ITBMS (7%)</span> <span className="cost-value">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="total-row">
              <span className="total-label">TOTAL A PAGAR</span> <span className="total-value">{formatCurrency(totals.total)}</span>
            </div>

            <div className="info-note info-note-payment">
              💵 <strong>Condiciones de Pago:</strong>
              <br />• 30% para reservar: <span>{formatCurrency(totals.deposit30)}</span>
              <br />• 70% antes del embarque: <span>{formatCurrency(totals.balance70)}</span>
            </div>

            <button
              className="download-btn"
              id="download-pdf"
              disabled={!canDownloadPdf || isGeneratingPdf}
              aria-busy={isGeneratingPdf}
              onClick={onDownloadPdf}
            >
              📄 Descargar Cotización en PDF
            </button>

            <div className="info-note">
              ℹ️ <strong>Garantía:</strong> 2 años o 20,000 km (lo que ocurra primero)
              <br />
              <strong>Validez:</strong> 15 días • <strong>Incluye:</strong> Documentos de exportación, embalaje, despacho de aduana en origen
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
