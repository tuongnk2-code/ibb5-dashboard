import { requireProfile } from './_supabaseAdmin.js';
import { sharedRow } from './_dashboardState.js';
const documents = [
  {code:'2-SEL.0.0.1-QT/KD/HDCV/FTEL',title:'Quy trình bán hàng'},
  {code:'2-SEL.0.0.1-QD/KD/HDCV/FTEL',title:'Quy định lên hợp đồng'},
];

export function createRegulationsHandler(authenticate = requireProfile) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.status).json({ error: auth.error });
      if (req.method !== 'GET') return res.status(405).json({ error: 'Phương thức không hỗ trợ.' });
      const code = req.query?.code || documents[0].code;
      if (!documents.some(doc => doc.code === code)) return res.status(400).json({error:'Mã tài liệu không hợp lệ.'});
      const row = await sharedRow(auth.admin, 'qms:' + code);
      if (!row) return res.status(404).json({ error: 'Chưa có nội dung tài liệu.' });
      const {pdfBase64,...document} = row.data;
      return res.status(200).json({ document, documents });
    } catch {
      return res.status(500).json({ error: 'Chưa tải được quy trình. Vui lòng thử lại.' });
    }
  };
}
