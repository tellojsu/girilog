import { useState, useCallback } from 'react';

export function usePDFDownload() {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = useCallback(async (elementId: string, filename: string) => {
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      // Temporarily show element for capture if it's visibility:hidden
      const originalVisibility = element.style.visibility;
      element.style.visibility = 'visible';

      // Temporarily make it full-width for capture
      const originalStyle = element.getAttribute('style') || '';
      element.style.width = '794px'; // A4 width in px at 96dpi
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: true,
        width: 794,
        windowWidth: 1200, // Use a larger window width to avoid wrapping in clone
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.position = 'relative';
            clonedElement.style.left = '0';
            clonedElement.style.width = '794px';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.display = 'block';
            clonedElement.style.margin = '0';
            clonedElement.style.padding = '0';
          }
        }
      });

      // Restore original style
      element.setAttribute('style', originalStyle);
      element.style.visibility = originalVisibility;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content is taller than one page, scale to fit
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice canvas into page-height chunks
        const pageHeightPx = (canvas.width * pdfHeight) / pdfWidth;
        let yOffset = 0;
        let pageNum = 0;

        while (yOffset < canvas.height) {
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(pageHeightPx, canvas.height - yOffset);
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          }
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceHeight = (sliceCanvas.height * pdfWidth) / canvas.width;

          if (pageNum > 0) pdf.addPage();
          pdf.addImage(sliceData, 'PNG', 0, 0, imgWidth, sliceHeight);

          yOffset += pageHeightPx;
          pageNum++;
        }
      }

      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  }, []);

  return { downloadPDF, downloading };
}
