function getModalElement(modalId) {
  const element = document.getElementById(modalId);
  if (!element || typeof element.showModal !== 'function') return null;
  return element;
}

export function setModalContent(modalId, { title = '', bodyHtml = '', footerHtml = '' } = {}) {
  const modal = getModalElement(modalId);
  if (!modal) return;
  const titleNode = modal.querySelector('[data-modal-title]');
  const bodyNode = modal.querySelector('[data-modal-body]');
  const footerNode = modal.querySelector('[data-modal-footer]');
  if (titleNode) titleNode.textContent = title;
  if (bodyNode) bodyNode.innerHTML = bodyHtml;
  if (footerNode) footerNode.innerHTML = footerHtml;
}

export function openModal(modalId) {
  const modal = getModalElement(modalId);
  if (!modal) return false;
  modal.showModal();
  return true;
}

export function closeModal(modalId) {
  const modal = getModalElement(modalId);
  if (!modal) return false;
  modal.close();
  return true;
}
