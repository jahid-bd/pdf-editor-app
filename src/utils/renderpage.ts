import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { getItemsByPage, injectItem, updateItem } from './localstorage';

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

let fabricPageIndex = 1;

const renderPage = (
  pdf: any,
  pageNum: number,
  numPages: number,
  cb: (c: any) => any,
  viewerRef: React.RefObject<HTMLDivElement>,
  zoom: number
) => {
  if (!pdf) return;

  pdf.getPage(pageNum).then((page: any) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.setAttribute('page-num', String(pageNum));

    let viewport = page.getViewport({ scale: 1, rotate: 0 }); // Set rotate to 0

    let scale =
      (viewerRef.current?.clientWidth || document.documentElement.clientWidth) /
      viewport.width;

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
          renderPage(pdf, pageNum + 1, numPages, cb, viewerRef, zoom);
        } else {
          cb(cb);
        }
      }
    });
  });
};

export default renderPage;
