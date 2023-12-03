import { useEffect, useState } from 'react';
import { getItems } from '../utils/localstorage';

const useFileUpload = (triggerModal: (value: 'open' | 'close') => void) => {
  const [files, setFiles] = useState<(File | string)[]>(getItems('pdfs') || []);
  const [hasFileUploaded, setHasFileUploaded] = useState(false);

  useEffect(() => {
    const pdfs = getItems('pdfs');
    setHasFileUploaded(pdfs && pdfs.length > 0);
  }, []);

  const handleUploadFile = (uploadedFiles: any) => {
    triggerModal('close');
    setFiles(uploadedFiles);
    setHasFileUploaded(true);
  };

  return { files, hasFileUploaded, handleUploadFile };
};

export default useFileUpload;
