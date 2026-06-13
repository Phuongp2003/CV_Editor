import { exportDocx } from './modules/export/docxExporter.js';

/**
 * @deprecated Use exportDocx({ cv, labels, typography }) from modules/export/docxExporter.js
 */
export async function generateDocx(json, save = false) {
  const blob = await exportDocx({ cv: json });
  if (!save) return blob;
  const saveName = prompt('Enter a name for your save file');
  if (saveName === null) return blob;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${saveName ? saveName : 'resume'}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return blob;
}