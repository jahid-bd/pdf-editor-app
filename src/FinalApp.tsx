import { fabric } from 'fabric';
import { useEffect } from 'react';
import FileUploadModal from './components/FileUploadModal';
import Header from './components/header';
import useFabricCanvas from './hooks/useFabricCanvas';
import useFileUpload from './hooks/useFileUpload';
import useModal from './hooks/useModal';
import usePdfLoading from './hooks/usePdfLoading';
import { renderDeleteIcon } from './utils';
import { getItemsByPage, updateItem } from './utils/localstorage';

const NewApp = () => {
  renderDeleteIcon();
  const { files, hasFileUploaded, handleUploadFile } = useFileUpload();
  const { loadedPdfs, totalPageCount } = usePdfLoading(files);
  const { viewerRef, zoom, setZoom } = useFabricCanvas();
  const { showModal, triggerModal } = useModal();

  const dataTransfer = (t: string) => (e: any) =>
    e.dataTransfer.setData('type', t);

  // render the all pdf pages
  let fabricPageIndex = 1;

  const renderPageWrapper = (
    pdf: any,
    pageNum: number,
    numPages: number,
    cb: (c: any) => any
  ) => {
    if (!pdf) return;

    pdf.getPage(pageNum).then((page: any) => {
      const canvas = renderCanvas(page, pageNum);

      const fabricCanvas = renderFabricCanvas(canvas, page);

      fabricCanvas.on('object:modified', handleObjectModified);

      renderObjectsOnCanvas(fabricCanvas, pageNum);

      if (pdf && pageNum < numPages) {
        renderPageWrapper(pdf, pageNum + 1, numPages, cb);
      } else {
        cb(cb);
      }
    });
  };

  const handleCanvasDrop = (e: any) => {
    if (e.stopPropagation) {
      e.stopPropagation(); // stops the browser from redirecting.
    }
    const type = e.dataTransfer.getData('type');
    if (type === 'text') {
      // Handle text drop
    } else if (type === 'image') {
      // Handle image drop
    }
  };

  const handleCanvasDragOver = (e: any) => {
    if (e.preventDefault) {
      e.preventDefault(); // Necessary. Allows us to drop.
    }
    if (e.dataTransfer?.dropEffect) {
      e.dataTransfer.dropEffect = 'copy';
    }
    return false;
  };

  const renderCanvas = (page: any, pageNum: number) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.setAttribute('page-num', String(pageNum));

    let viewport = page.getViewport({ scale: 1, rotate: 0 });
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

      canvasDocument.ondrop = handleCanvasDrop;
      canvasDocument.ondragover = handleCanvasDragOver;

      fabricPageIndex += 1;
    });

    return canvas;
  };

  const renderFabricCanvas = (canvas: any, page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    const fabricCanvas = new fabric.Canvas(canvas, {
      height: viewport.height,
      width: viewport.width,
      backgroundColor: '#e5e5e5',
    });

    (window as any)[`fabric_page_${fabricPageIndex}`] = fabricCanvas;

    const image = new fabric.Image(canvas, { selectable: false });
    fabricCanvas.add(image);

    return fabricCanvas;
  };

  const handleObjectModified = (e: any) => {
    const id = e.target?.get('id' as any);
    const type = e.target?.get('type');
    const propertiesToUpdate = {
      x: e.target?.left,
      y: e.target?.top,
      scaleX: e.target?.scaleX,
      scaleY: e.target?.scaleY,
      height: e.target?.height,
      width: e.target?.width,
    };

    if (type === 'i-text' && 'text' in e.target) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      propertiesToUpdate.text = e.target?.text;
    }

    updateItem(id, propertiesToUpdate);
    console.log(e.target);
  };

  const renderObjectsOnCanvas = (fabricCanvas: any, pageNum: number) => {
    const getItemsForPage = getItemsByPage(String(pageNum));
    const items = generateFabricObjects(getItemsForPage || []);
    items.forEach((object: any) => fabricCanvas.add(object));
  };

  const generateFabricObjects = (items: any[]) => {
    return items
      .map((item) => {
        if (item.type === 'image') {
          return createFabricImage(item);
        }

        if (item.type === 'text') {
          return createFabricText(item);
        }

        return null;
      })
      .filter((object) => object !== null);
  };

  const createFabricImage = (item: any) => {
    const image = new Image();
    image.src = item.src;
    const fabricImage = new fabric.Image(image, {
      height: item.height,
      width: item.width,
      left: item.x,
      top: item.y,
      originX: 'center',
      originY: 'center',
      scaleX: item.scaleX,
      scaleY: item.scaleY,
    });

    (fabricImage as any).set('id', item.id);
    return fabricImage;
  };

  const createFabricText = (item: any) => {
    const fabricText = new fabric.IText(item.text, {
      left: item.x,
      top: item.y,
      editable: true,
      originX: 'center',
      originY: 'center',
      fontFamily: 'sans-serif',
      scaleX: item.scaleX,
      scaleY: item.scaleY,
    });

    (fabricText as any).set('id', item.id);
    return fabricText;
  };

  // render the padfs in browser when loadedPdfs data exist or zoomming
  useEffect(() => {
    if (loadedPdfs) {
      let currentPdf = 0;

      renderPageWrapper(
        loadedPdfs[currentPdf],
        1,
        loadedPdfs[currentPdf].numPages,
        (cb: any) => {
          if (currentPdf < loadedPdfs.length) {
            currentPdf++;
            renderPageWrapper(
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
        trigerModal={triggerModal}
        zoom={zoom}
        setZoom={setZoom}
        hasFiles={hasFileUploaded}
        totalPages={totalPageCount}
      />
      {showModal && (
        <FileUploadModal
          trigerModal={triggerModal}
          handleUploadFile={handleUploadFile}
        />
      )}
      <div
        className="mt-[80px] bg-secondary min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-5"
        ref={viewerRef}
        style={{ width: '100%' }}
      ></div>
    </>
  );
};

export default NewApp;
