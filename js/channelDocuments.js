import '../css/channelDocuments.css';

const pdf = '/documents/sales-channels/facebook-ads.pdf';
export function renderChannelDocuments(root) {
  root.innerHTML = `<div class="chdoc-head"><div><h2>Tài liệu kênh bán</h2><p>Tài liệu hướng dẫn và đào tạo theo từng kênh bán hàng.</p></div><span class="chdoc-count">1 tài liệu</span></div>
  <article class="chdoc-card"><img src="/documents/sales-channels/facebook-ads-cover.jpg" alt="Bìa tài liệu quảng cáo Facebook – FPT Telecom và Meta" width="640" height="360"><div><span class="chdoc-tag">Facebook · Meta</span><h3>Tài liệu chạy quảng cáo Facebook</h3><p>FPT Telecom × Meta · Masterclass Workshop</p><p class="chdoc-meta">PDF · 90 trang · 85,7 MB</p><div class="chdoc-actions"><button type="button" data-chdoc-read>Đọc tài liệu</button><a href="${pdf}" target="_blank" rel="noopener noreferrer">Mở PDF ↗</a><a href="${pdf}" download="tai-lieu-chay-ads-facebook.pdf">↓ Tải PDF</a></div></div></article>
  <section class="chdoc-reader" hidden><div class="chdoc-reader-head"><h3>Tài liệu chạy quảng cáo Facebook</h3><button type="button" data-chdoc-close>Đóng tài liệu</button></div><p>Trên điện thoại, bấm <a href="${pdf}" target="_blank" rel="noopener noreferrer">Mở PDF ↗</a> để xem toàn màn hình và đọc đủ 90 trang.</p><div data-chdoc-frame></div></section>`;
  const reader = root.querySelector('.chdoc-reader');
  root.querySelector('[data-chdoc-read]').onclick = () => {
    reader.hidden = false;
    if (!reader.querySelector('iframe')) {
      const frame = document.createElement('iframe');
      frame.title = 'Tài liệu chạy quảng cáo Facebook – 90 trang';
      frame.src = pdf + '#view=FitH';
      root.querySelector('[data-chdoc-frame]').append(frame);
    }
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  root.querySelector('[data-chdoc-close]').onclick = () => { reader.hidden = true; root.querySelector('[data-chdoc-frame]').replaceChildren(); };
}
