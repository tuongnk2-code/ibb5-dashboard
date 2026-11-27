export const CHANNEL_BUCKET = 'sales-channel-documents';
export const CHANNEL_FILE_LIMIT = 50 * 1024 * 1024;
export const DOCUMENT_CHANNELS = ['Chung', 'Facebook', 'Zalo', 'SMS', 'Email', 'Thị trường', 'Khác'];
export const DOCUMENT_TYPES = {
  pdf:'application/pdf', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp',
};
export const canUploadChannelDocument = profile => ['manager', 'lead', 'staff'].includes(profile?.role);
export function validateChannelDocument(input) {
  const title = String(input.title || '').trim(), fileName = String(input.fileName || '').trim();
  const extension = fileName.split('.').at(-1).toLowerCase(), mime = DOCUMENT_TYPES[extension];
  if (!title || title.length > 160) throw Error('Nhập tên tài liệu, tối đa 160 ký tự.');
  if (!fileName || fileName.length > 220 || /[\x00-\x1f/\\]/.test(fileName) || !mime) throw Error('Chỉ nhận PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, PNG và WebP.');
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > CHANNEL_FILE_LIMIT) throw Error('Mỗi file tối đa 50 MB và phải có nội dung.');
  if (!DOCUMENT_CHANNELS.includes(input.channel)) throw Error('Chọn kênh bán hợp lệ.');
  return { title, fileName, extension, mime, size: input.size, channel: input.channel };
}
export function matchesDocumentHeader(extension, bytes) {
  const text = String.fromCharCode(...bytes.slice(0, 12));
  if (extension === 'pdf') return text.startsWith('%PDF-');
  if (['docx','xlsx','pptx'].includes(extension)) return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
  if (extension === 'png') return bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  if (['jpg','jpeg'].includes(extension)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return extension === 'webp' && text.startsWith('RIFF') && text.slice(8) === 'WEBP';
}
