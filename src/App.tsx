import { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';

import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';
import FileUploadModal from './components/FileUploadModal';
import Header from './components/header';
import { convertDataURIToBinary, renderDeleteIcon } from './utils';
import {
  getItems,
  getItemsByPage,
  injectItem,
  updateItem,
} from './utils/localstorage';

renderDeleteIcon();

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function App() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loadedPdfs, setLoadedPdfs] = useState<PDFDocumentProxy[] | null>(null);
  // uploaded file
  const [files, setFiles] = useState<(File | string)[]>(() => {
    return getItems('pdfs') || [];
  });

  // const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!files.length) return;
    async function pdfLoader() {
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
    }
    pdfLoader();

    return () => {
      loadedPdfs?.forEach((l) => {
        l.destroy();
      });
      setLoadedPdfs(null);
    };
  }, [files]);

  // file upload triger
  const [hasFileUploaded, setHasFileUploaded] = useState(false);
  const [zoom, setZoom] = useState(90);
  const [showModal, setShowModal] = useState<boolean>(false);

  const trigerModal = (value: 'open' | 'close') => {
    value === 'open' ? setShowModal(true) : setShowModal(false);
  };

  const [totalPageCount, setTotalPageCount] = useState<number>(0);

  const dataTransfer = (t: string) => (e: any) =>
    e.dataTransfer.setData('type', t);

  useEffect(() => {
    const pdfs = getItems('pdfs');
    if (pdfs && pdfs.length > 0) {
      setHasFileUploaded(true);
      return;
    }
    trigerModal('open');
  }, []);

  const handleUploadFile = (v: any) => {
    trigerModal('close');
    setFiles(v);
    setHasFileUploaded(true);
  };

  let fabricPageIndex = 1;
  function renderPage(
    pdf: any,
    pageNum: number,
    numPages: number,
    cb: (c: any) => any
  ) {
    if (!pdf) return;
    pdf.getPage(pageNum).then((page: any) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.setAttribute('page-num', String(pageNum));

      let viewport = page.getViewport({ scale: 1, rotate: 0 }); // Set rotate to 0

      let scale =
        (viewerRef.current?.clientWidth ||
          document.documentElement.clientWidth) / viewport.width;

      scale = (scale / 100) * zoom;
      viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({ canvasContext: context, viewport }).promise?.then(() => {
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-page';
        wrapper.setAttribute('data-page', String(fabricPageIndex));
        const canvasDocument = document.createElement('canvas');
        canvasDocument.setAttribute('data-page', String(fabricPageIndex));
        wrapper.appendChild(canvasDocument);
        viewerRef.current?.appendChild(wrapper);

        const fabricCanvas = new fabric.Canvas(canvasDocument, {
          height: viewport.height,
          width: viewport.width,
          backgroundColor: '#e5e5e5',
        });

        // only jpeg is supported by jsPDF
        wrapper.ondrop = (e: any) => {
          if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
          }
          const type = e.dataTransfer.getData('type');
          if (type === 'text') {
            const sampleText = 'Sample Text';
            const text = new fabric.IText(sampleText, {
              left: e.layerX,
              top: e.layerY,
              editable: true,
              originX: 'center',
              originY: 'center',
              fontFamily: 'sans-serif',
            });
            const _id = uuidv4();
            (text as any).set('id', _id);
            injectItem({
              page: String(pageNum),
              id: _id,
              type: 'text',
              x: e.layerX,
              y: e.layerY,
              height: text.height,
              width: text.width,
              scaleX: text.scaleX,
              scaleY: text.scaleY,
              text: sampleText,
            });

            fabricCanvas.add(text);
            fabricCanvas.requestRenderAll();
          }

          if (type === 'image') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.click();
            input.addEventListener('change', (ie: any) => {
              const files = ie.target.files;
              for (let i = 0; i < files.length; i++) {
                const file: File = files.item(i);

                const image = new Image();
                image.src = URL.createObjectURL(file);
                image.onload = function () {
                  const img = new fabric.Image(image, {
                    height: image.height,
                    width: image.width,
                    left: e.layerX,
                    top: e.layerY,
                    originX: 'center',
                    originY: 'center',
                  });
                  const _id = uuidv4();
                  (img as any).set('id', _id);

                  injectItem({
                    page: String(pageNum),
                    id: _id,
                    type: 'image',
                    x: e.layerX,
                    y: e.layerY,
                    height: img.height,
                    width: img.width,
                    scaleX: img.scaleX,
                    scaleY: img.scaleY,
                    src: img.toDataURL({ format: 'image/png' }),
                  });
                  console.log(img);
                  fabricCanvas.add(img);
                };
              }
              fabricCanvas.requestRenderAll();
            });
          }
        };

        wrapper.ondragover = (e: any) => {
          if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
          }
          if (e.dataTransfer?.dropEffect) {
            e.dataTransfer.dropEffect = 'copy';
          }
          return false;
        };

        // Add a unique identifier for each fabricCanvas instance
        (window as any)[`fabric_page_${fabricPageIndex}`] = fabricCanvas;
        fabricPageIndex += 1;

        const image = new fabric.Image(canvas, {
          selectable: false,
        });

        fabricCanvas.on('object:modified', (e: any) => {
          const id = e.target?.get('id' as any);
          const type = e.target?.get('type');
          if (type == 'i-text') {
            updateItem(id, {
              x: e.target?.left,
              y: e.target?.top,
              scaleX: e.target?.scaleX,
              scaleY: e.target?.scaleY,
              height: e.target?.height,
              width: e.target?.width,
              text: e.target?.get('text'),
            });
          }
          if (type == 'image') {
            updateItem(id, {
              x: e.target?.left,
              y: e.target?.top,
              scaleX: e.target?.scaleX,
              scaleY: e.target?.scaleY,
              height: e.target?.height,
              width: e.target?.width,
            });
          }
          console.log(e.target);
        });

        fabricCanvas.add(image);
        const getItems = getItemsByPage(String(pageNum));
        const items = generateItem(getItems || []);

        items.forEach((v: any) => {
          fabricCanvas.add(v);
        });
        if (pdf) {
          if (pageNum < numPages) {
            renderPage(pdf, pageNum + 1, numPages, cb);
          } else {
            cb(cb);
          }
        }
      });
    });
  }

  const generateItem = (items: any[]) => {
    return items
      .map((v) => {
        if (v.type === 'image') {
          const image = new Image();
          image.src = v.src;
          const img = new fabric.Image(image, {
            height: v.height,
            width: v.width,
            left: v.x,
            top: v.y,
            originX: 'center',
            originY: 'center',
            scaleX: v.scaleX,
            scaleY: v.scaleY,
          });
          (img as any).set('id', v.id);
          return img;
        }
        if (v.type == 'text') {
          const text = new fabric.IText(v.text, {
            left: v.x,
            top: v.y,
            editable: true,
            originX: 'center',
            originY: 'center',
            fontFamily: 'sans-serif',
            scaleX: v.scaleX,
            scaleY: v.scaleY,
          });
          (text as any).set('id', v.id);
          return text;
        }

        return null;
      })
      .filter((v: any) => v != null);
  };

  useEffect(() => {
    if (loadedPdfs) {
      let currentPdf = 0;

      renderPage(
        loadedPdfs[currentPdf],
        1,
        loadedPdfs[currentPdf].numPages,
        (cb: any) => {
          if (currentPdf < loadedPdfs.length) {
            currentPdf++;
            renderPage(
              loadedPdfs[currentPdf],
              1,
              loadedPdfs[currentPdf].numPages,
              cb
            );
          }
        }
      );
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
      fabricPageIndex = 1;
    };
  }, [zoom, loadedPdfs]);

  return (
    <>
      <Header
        dataTransfer={dataTransfer}
        trigerModal={trigerModal}
        zoom={zoom}
        setZoom={setZoom}
        hasFiles={hasFileUploaded}
        totalPages={totalPageCount}
      />
      {showModal && (
        <FileUploadModal
          trigerModal={trigerModal}
          //   setFiles={(v: any) => setFiles(v)}
          handleUploadFile={handleUploadFile}
        />
      )}
      <div
        className="mt-[80px] bg-secondary min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-5"
        ref={viewerRef}
        style={{ width: '100%' }}
      ></div>

      {/* {isLoading && (
        <div className="fixed inset-0 bg-black text-white bg-opacity-60 transition-opacity z-50 overflow-hidden h-screen w-full flex items-center justify-center">
          <div className="bg-black px-4 py-2">
            <h1 className="text-4xl text-white">Loading....</h1>
          </div>
        </div>
      )} */}
    </>
  );
}

export default App;
