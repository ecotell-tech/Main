import { useCallback, useState } from 'react';

/**
 * Manages open/close state for a named modal.
 *
 * @returns {{ isOpen: boolean, openModal: Function, closeModal: Function, toggleModal: Function }}
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const openModal  = useCallback(() => setIsOpen(true),  []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, openModal, closeModal, toggleModal };
}
