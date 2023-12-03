import { useState } from 'react';

const useModal = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const triggerModal = (value: 'open' | 'close') => {
    setShowModal(value === 'open');
  };

  return { showModal, triggerModal };
};

export default useModal;
