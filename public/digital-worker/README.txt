IBB5 - BO KET NOI NHAN SU SO

1. Tren IBB5, mo Nhan su so > May ket noi > Ket noi may.
2. Tai tep ket noi rieng ibb5-worker.local.json. Khong chia se tep nay.
3. May can Node.js 20 tro len. Dat tep ket noi cung thu muc voi worker-agent.mjs.
4. Mo terminal tai thu muc nay va chay:
   node worker-agent.mjs ibb5-worker.local.json
5. De chay ngan, tao Scheduled Task cua Windows chay lenh tren KHI DANG NHAP.
   Chon chi chay khi nguoi dung da dang nhap neu tool can giao dien.
   May phai bat va tool phai co phien dang nhap hop le.

CAU HINH TOOL THUC TE
Ban nay la bo dieu hanh va giao tiep. Khong kem tool Zalo/Facebook hay bo loc data.
Can tich hop dung tool dang dung truoc khi kenh san sang. Khong nhap mat khau
Facebook/Zalo vao dashboard hay gui mat khau ve may chu IBB5.

Ky thuat vien cau hinh handlers tren chinh may tinh. Vi du:
"handlers": {
  "facebook_search": {
    "command": "C:\\Program Files\\nodejs\\node.exe",
    "args": ["C:\\IBB5\\adapters\\facebook-search.mjs"],
    "timeoutSeconds": 600
  }
}
Duong dan tren chi la vi du, khong phai mot adapter da duoc cung cap.
Khong lay command/args tu yeu cau tu xa. Chi su dung adapter da kiem tra tren may.
Kenh thuc te: meta_facebook, top_zalo, chot_care, sms_akabiz, fbnumber, fb_akabiz, fpt_sop.
Kenh chung: facebook_search, zalo_campaign, facebook_post, email_campaign, other.
Moi kenh can adapter rieng, khong tu coi cac tool khac nhau la cung mot giao dien.

GIAO UOC ADAPTER
- Nhan 1 JSON qua stdin: run_id, idempotency_key, name, channel, config.
- config gom keywords, sources, content. Day la du lieu, khong phai lenh shell.
- Kiem tra quyen truy cap nguon, dieu kien lien he KH, danh sach loai tru/trung lap.
- Kiem tra CAPTCHA/xac minh va tra loi de nhan su xu ly, khong vuot xac minh.
- Dung run_id de tranh gui/lap thao tac khi tool co ho tro idempotency.
- Chi tra succeeded khi co bang chung ket qua tu tool.
- stdout chi tra 1 JSON, vi du:
  {"status":"succeeded","summary":"Da hoan tat 12 muc; ma phien: ..."}
- status chi nhan succeeded / failed / cancelled. summary toi da 2000 ky tu.
- Khong tra mat khau, token hay danh sach SDT/du lieu KH vao summary.
- Khi qua thoi gian hoac bi yeu cau dung, runner dung tien trinh adapter.
  Adapter phai dung cac hoat dong dang thuc hien. Viec da gui khong the hoan tac.

KHI GIAN DOAN
Bo ket noi luu nhat ky cuc bo va thu gui lai KET QUA, khong tu chay lai tac vu.
Neu khong biet tool da thuc hien hay chua, danh dau Can kiem tra.
Khong xoa tep .journal khi dang co tac vu. Kiem tra tool truoc khi chay lai.
Co the ngat khoa may tu dashboard. Tao ket noi moi neu lam mat tep ket noi.

LICH CHAY
Lich xu ly khi may truc tuyen, mac dinh kiem tra moi 60 giay.
Khi may tat, IBB5 hien ngoai tuyen. Khi ket noi lai, chi chay mot ky dang cho,
khong tu bu lai tung ngay da lo. Moi may chay tung viec theo hang doi.
Tam dung lich khong dung luot da giao; dung Yeu cau dung tai Ket qua.

CHI PHI
Bo ket noi khong co phi ban quyen rieng. Khong tu mua goi, nap tien, chay
quang cao, hay kich hoat dich vu tra phi. Phi ha tang tinh theo su dung thuc te.

FPT SOP: https://portal-sop.fpt.vn/trang-chu
Can adapter va phien dang nhap hop le truoc khi tu dong thuc hien.

QUY TRINH NHIEU BUOC (workflow_v1)
- Nang cap bo ket noi nay de nhan quy trinh nhieu buoc.
- Moi buoc can handler rieng. Thieu bat ky kenh nao thi khong nhan viec.
- Adapter co the tra truong output (JSON nho) de chuyen cho buoc tiep theo.
- Buoc tiep theo doc truong previous tu stdin. Du lieu nay chi di tren may.
- Ket qua dua len IBB5 chi gom status va summary, khong gom output trung gian.
- Dung ngay khi mot buoc loi. Khong tu chay lai cac buoc da lam khi gian doan.
