import { useEffect, useRef, useState } from 'react';

const useFabricCanvas = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(90);

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.innerHTML = ''; // Clear canvas when zoom changes
    }
  }, [zoom]);

  return { viewerRef, zoom, setZoom };
};

export default useFabricCanvas;
