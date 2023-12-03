import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useState } from 'react';
import { convertDataURIToBinary } from '../utils';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const usePdfLoading = (files: (File | string)[]) => {
  const [loadedPdfs, setLoadedPdfs] = useState<PDFDocumentProxy[] | null>(null);
  const [totalPageCount, setTotalPageCount] = useState<number>(0);

  const pdfLoader = async () => {
    const pdfArr = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pdf = await pdfjsLib.getDocument(
        file instanceof File
          ? URL.createObjectURL(file)
          : convertDataURIToBinary(file)
      ).promise;
      setTotalPageCount((prevTotal) => prevTotal + pdf.numPages);
      pdfArr.push(pdf);
    }
    setLoadedPdfs(pdfArr);
  };

  useEffect(() => {
    if (!files.length) return;
    pdfLoader();

    return () => {
      loadedPdfs?.forEach((l) => {
        l.destroy();
      });
      setLoadedPdfs(null);
    };
  }, [files]);

  return { loadedPdfs, totalPageCount };
};

export default usePdfLoading;
