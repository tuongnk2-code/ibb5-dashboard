import { requireProfile } from './_supabaseAdmin.js';
import { sharedRow } from './_dashboardState.js';

export function createRegulationsHandler(authenticate = requireProfile) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const auth = await authenticate(req);
      if (auth.error) return res.status(auth.status).json({ error: auth.error });
      if (req.method !== 'GET') return res.status(405).json({ error: 'Phương thức không hỗ trợ.' });
      const row = await sharedRow(auth.admin, 'qms:2-SEL.0.0.1-QT/KD/HDCV/FTEL');
      if (!row) return res.status(404).json({ error: 'Chưa có nội dung tài liệu.' });
      return res.status(200).json({ document: row.data });
    } catch {
      return res.status(500).json({ error: 'Chưa tải được quy trình. Vui lòng thử lại.' });
    }
  };
}
