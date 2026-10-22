/* Two editorial experiences: the seasonal cover and a personal style selection. */
function atelierHomeHero(summary) {
  const slide=editorialSlides[0];
  return `<section class="hero editorial-hero atelier-hero" aria-label="Cảm hứng thời trang VELASTYLE" aria-roledescription="bộ sưu tập trình chiếu">
    <div class="hero-copy atelier-cover-copy">
      <div class="cover-edition"><span>VELA / TUYỂN TẬP PHONG CÁCH</span><span>THU — ĐÔNG 2026</span></div>
      <span class="eyebrow">${slide.eyebrow}</span>
      <h1>${slide.title}</h1>
      <p>${slide.description}</p>
      <div class="cover-cta-row"><a href="${slide.href}" data-link class="button primary hero-cta">${slide.button} ${icon('arrow')}</a><button class="cover-personal-link" data-studio-action="quiz">Tìm gu của tôi <span>✧</span></button></div>
      <div class="cover-footnote"><span class="cover-footnote-mark">✳</span><div><b>Được chọn bằng gu.</b><span>Được hiểu bằng công nghệ.</span></div><div class="cover-catalog-count"><b>${summary.total}</b><span>thiết kế để khám phá</span></div></div>
      <span class="cover-watermark" aria-hidden="true">V.</span>
    </div>
    <div class="hero-image atelier-cover-image">
      <img id="hero-photo" src="/static/images/${slide.image}" alt="Hai nàng thơ trong những thiết kế màu kem thanh lịch" fetchpriority="high" width="1800" height="1200">
      <div class="cover-image-topline"><span>MỘT MÙA CẢM HỨNG MỚI</span><span>VELASTYLE ®</span></div>
      <div class="cover-roundel" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="vela-roundel-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"/></defs><text><textPath href="#vela-roundel-path" textLength="222">MỘT CHÚT TINH TẾ · MỘT PHIÊN BẢN RIÊNG · </textPath></text></svg><span>✳</span></div>
      <a class="cover-inset" href="/san-pham?style=Nữ tính" data-link aria-label="Khám phá cảm hứng nữ tính"><div class="inset-pin" aria-hidden="true"></div><img id="hero-inset-photo" src="/static/images/dress-garden.jpg" alt="Chi tiết đầm hoa trong ánh nắng" width="400" height="550"><span><i>Chút riêng của nàng.</i>${icon('arrow-diagonal')}</span></a>
      <div class="hero-image-label"><span>${slide.label}</span><p>${slide.caption}</p></div>
      <span class="cover-vertical-label">PHONG CÁCH KHÔNG CẦN MỘT KHUÔN MẪU.</span>
    </div>
    <div class="hero-slider-controls cover-slider-footer">
      <div class="cover-current"><span class="hero-slide-number"><b id="slide-number">01</b><span> / 03</span></span><span class="cover-current-label">Một mùa. Nhiều cảm hứng.</span></div>
      <div class="hero-dots cover-collection-tabs">${[['Thanh lịch tự nhiên','hero-beige.jpg'],['Một khoảng trời riêng','dress-satin.jpg'],['Giản đơn mỗi ngày','store.jpg']].map(([label,image],i)=>`<button class="hero-dot ${i===0?'active':''}" data-hero-slide="${i}" aria-label="Bộ sưu tập ${i+1}" aria-pressed="${i===0}"><img src="/static/images/${image}" alt="" width="38" height="43"><span><small>0${i+1} / CẢM HỨNG</small><b>${label}</b></span><i aria-hidden="true"></i></button>`).join('')}</div>
      <div class="hero-arrows"><button data-hero-direction="-1" aria-label="Bộ sưu tập trước">${icon('arrow')}</button><button data-hero-direction="1" aria-label="Bộ sưu tập tiếp theo">${icon('arrow')}</button></div>
    </div>
  </section>`;
}

function musePortrait(product,index) {
  return `<a class="muse-portrait muse-portrait-${index} ${product.thumbnail.includes('/catalog-')?'muse-catalog-portrait':''}" href="/san-pham/${product.id}" data-link aria-label="Xem ${esc(product.name)}"><span class="muse-portrait-index">0${index+1} / TUYỂN CHỌN</span><img src="${esc(product.thumbnail)}" alt="${esc(product.name)}" width="380" height="510" loading="eager"><div class="muse-portrait-caption"><span>${esc(product.name)}</span><b>${money(product.price)}</b></div><span class="muse-portrait-arrow">${icon('arrow-diagonal')}</span></a>`;
}
function atelierForYou(data,{method,gender,max}) {
  const user=state.user;const prefs=user?.preferences||{};const firstName=user?.full_name.split(' ')[0]||'';
  const personalized=!!user&&data.status==='personalized';
  const moodItems=data.items.slice(0,3);
  const modes=[['hybrid','sparkles','Gợi ý kết hợp','Hành vi gặp gỡ phong cách'],['collaborative','heart','Cùng gu với bạn','Cảm hứng từ những người cùng gu'],['clip','eye','Cảm hứng tương đồng','Đồng điệu từ hình ảnh & mô tả']];
  const gu=prefs.style||'Đang khám phá';const budget=max?money(+max):prefs.budget?money(prefs.budget):'Tự do lựa chọn';
  return `<section class="container page-space muse-page">${breadcrumb('Dành riêng cho bạn')}
    <section class="for-you-hero muse-hero" aria-label="Tuyển chọn phong cách cá nhân">
      <div class="muse-hero-copy"><div class="muse-kicker"><span>${icon('sparkles')} TUYỂN CHỌN RIÊNG CỦA ${user?esc(firstName.toUpperCase()):'BẠN'}</span><i>VELA / PHIÊN BẢN CÁ NHÂN</i></div>
        <span class="muse-intro-line">Giữa hàng trăm lựa chọn, có những điều rất riêng.</span>
        <h1>${user?`<span class="muse-title-lead">Một chút cảm hứng</span><br>cho <em>${esc(firstName)}.</em>`:'Gu của bạn.<br><em>Một phiên bản riêng.</em>'}</h1>
        <p>${personalized?'Từ những thiết kế bạn dừng lại ngắm, những món bạn lưu và những lựa chọn bạn yêu — chúng mình gom thành một góc cảm hứng dành riêng cho bạn.':user?'Từ một vài điều bạn yêu, chúng mình bắt đầu một câu chuyện phong cách. Khám phá và lưu lại thiết kế đầu tiên để tủ đồ ngày càng hiểu gu của bạn.':'Không cần chạy theo một khuôn mẫu. Chọn vài điều bạn thích, khám phá một chút — để mỗi lựa chọn đều mang dấu ấn của bạn.'}</p>
        <div class="muse-hero-actions"><a href="#muse-selection" class="button muse-primary" data-muse-scroll>Khám phá tuyển chọn ${icon('arrow')}</a><button class="muse-preference-link" data-studio-action="quiz">${icon('settings')} ${prefs.style?'Làm mới gu của tôi':'Tìm gu của tôi'}</button></div>
        <div class="muse-personal-signature"><span>${user?esc(firstName[0]):'✧'}</span><p>${personalized?'Tuyển chọn từ lịch sử tương tác của bạn':'Mỗi lựa chọn là một chút hiểu bạn hơn'}<small>${user?'Bạn chọn gu. VELA tìm cảm hứng.':'Đăng nhập để lưu tủ đồ phong cách của bạn.'}</small></p><i>✳</i></div>
      </div>
      <div class="muse-gallery" aria-label="Một vài thiết kế từ tuyển chọn"><div class="muse-orbit orbit-a"></div><div class="muse-orbit orbit-b"></div><span class="muse-spark muse-spark-one">✧</span><span class="muse-spark muse-spark-two">✳</span><span class="muse-gallery-note">MỘT CHÚT CẢM HỨNG.<br>MỘT PHIÊN BẢN RẤT BẠN.</span>${moodItems.length?moodItems.map(musePortrait).join(''):'<img class="muse-empty-art" src="/static/images/wardrobe.jpg" alt="Một tủ đồ đầy cảm hứng">'}<div class="muse-curated-seal"><span>ĐƯỢC CHỌN</span><b>bằng gu.</b><span>VELASTYLE</span></div></div>
    </section>
    <div class="muse-style-pass"><span class="style-pass-title">${icon('user')} THẺ PHONG CÁCH <i>của ${user?esc(firstName):'bạn'}</i></span><div><small>GU BẠN ĐÃ CHỌN</small><b>${esc(gu)}</b></div><div><small>${max?'GIỚI HẠN ĐANG LỌC':'NGÂN SÁCH THAM KHẢO'}</small><b>${budget}</b></div><div><small>TRONG TUYỂN CHỌN NÀY</small><b>${data.items.length} <span>thiết kế</span></b></div><button data-studio-action="quiz" aria-label="Chỉnh sửa sở thích phong cách">${icon('settings')}<span>Điều chỉnh</span></button></div>
    <section class="muse-selection" id="muse-selection"><div class="muse-selection-heading"><div><span class="small-label">BẠN CÓ THỂ SẼ YÊU NHỮNG ĐIỀU NÀY</span><h2>Một góc riêng, <em>đúng gu bạn.</em></h2></div><button class="muse-how-link" data-muse-about>${icon('sparkles')} VELA chọn cho bạn thế nào?</button></div>
      <div class="recommendation-controls muse-controls"><div class="product-tabs muse-modes" aria-label="Chọn góc nhìn gợi ý">${modes.map(([m,name,title,description],i)=>`<button class="tab-button muse-mode ${method===m?'active':''}" data-method="${m}" aria-pressed="${method===m}"><span class="muse-mode-icon">${icon(name)}</span><span><b>${title}</b><small>${description}</small></span><i>0${i+1}</i></button>`).join('')}</div></div>
      <div class="muse-filter-row"><p class="recommendation-note"><span class="muse-live-dot"></span>${esc(data.message)}${method!=='collaborative'&&!data.clip_ready?' · CLIP đang chờ được chuẩn bị.':''}</p><div class="muse-selects"><label>${icon('filter')}<select id="recommend-gender" aria-label="Danh mục gợi ý"><option value="">Tất cả phong cách</option>${['Nữ','Nam','Unisex','Phụ kiện'].map(v=>`<option ${v===gender?'selected':''}>${v}</option>`).join('')}</select></label><label><select id="recommend-budget" aria-label="Ngân sách"><option value="">Mọi mức giá</option>${[['700000','Dưới 700.000đ'],['1000000','Dưới 1.000.000đ'],['1500000','Dưới 1.500.000đ']].map(([v,l])=>`<option value="${v}" ${v===max?'selected':''}>${l}</option>`).join('')}</select></label></div></div>
      <div class="muse-products">${data.items.length?grid(data.items,{reason:true}):empty('Chừa một khoảng trống cho cảm hứng mới','Thử điều chỉnh phong cách hoặc mức giá để khám phá thêm nhé.','Xem mọi gợi ý','/danh-rieng-cho-ban')}</div>
      <div class="muse-closing"><span>✧</span><div><h3>Gu của bạn luôn có thể thay đổi.</h3><p>Thử một điều mới. Lưu một thiết kế bạn yêu. Chúng mình sẽ tiếp tục lắng nghe.</p></div><button class="button outline round" data-studio-action="quiz">Kể thêm về gu của tôi ${icon('arrow')}</button></div>
    </section>
  </section>`;
}

function refreshAtelier() {
  const cover=$('.atelier-hero');const muse=$('.muse-hero');
  if(motionAllowed()){
    const elements=cover?$$('.cover-edition,.atelier-cover-copy .eyebrow,.atelier-cover-copy h1,.atelier-cover-copy>p,.cover-cta-row,.cover-footnote,.cover-inset',cover):muse?$$('.muse-kicker,.muse-intro-line,.muse-hero h1,.muse-hero-copy>p,.muse-hero-actions,.muse-personal-signature,.muse-portrait',muse):[];
    elements.forEach((element,index)=>element.animate([{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:850,delay:Math.min(index*85,600),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
    const area=cover||muse;if(area&&matchMedia('(pointer: fine)').matches){let frame=0;area.addEventListener('pointermove',event=>{if(frame)return;frame=requestAnimationFrame(()=>{const rect=area.getBoundingClientRect();area.style.setProperty('--drift-x',`${((event.clientX-rect.left)/rect.width-.5)*8}px`);area.style.setProperty('--drift-y',`${((event.clientY-rect.top)/rect.height-.5)*6}px`);frame=0;});});area.addEventListener('pointerleave',()=>{area.style.setProperty('--drift-x','0px');area.style.setProperty('--drift-y','0px');});}
  }
  document.querySelectorAll('[data-muse-scroll]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();$('#muse-selection')?.scrollIntoView({behavior:motionAllowed()?'smooth':'instant',block:'start'});}));
}
function updateAtelierSlide(index) {
  const image=$('#hero-inset-photo');if(!image)return;
  const images=['dress-garden.jpg','dress-floral.jpg','jacket-casual.jpg'];const labels=['Chút riêng của nàng.','Nhẹ một chút, yêu hơn.','Đơn giản mà có gu.'];
  image.src='/static/images/'+images[index];image.alt=labels[index];$('.cover-inset>span').innerHTML=`<i>${labels[index]}</i>${icon('arrow-diagonal')}`;
  $('.cover-inset').href=editorialSlides[index].href;
  $('#hero-photo').alt=['Hai nàng thơ trong thiết kế màu kem thanh lịch','Đầm maxi xanh nhẹ nhàng trên bãi biển','Tuyển chọn áo khoác cho những ngày thường'][index];
  if(motionAllowed())$('.cover-inset').animate([{opacity:.2,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:600,easing:'ease-out'});
}
document.addEventListener('click',event=>{if(event.target.closest('[data-muse-about]')){showModal(`<div class="muse-explainer"><span class="small-label">ĐƯỢC CHỌN BẰNG GU. ĐƯỢC HIỂU BẰNG CÔNG NGHỆ.</span><h2>Một chút hiểu bạn,<br>thêm nhiều cảm hứng.</h2><p>Không có một khuôn mẫu chung cho tất cả. Bạn có thể khám phá cùng một catalog từ ba góc nhìn.</p>${[['sparkles','Gợi ý kết hợp','Kết hợp tín hiệu từ lịch sử xem, yêu thích, giỏ hàng và mua sắm với đặc trưng hình ảnh, văn bản của sản phẩm.'],['heart','Cùng gu với bạn','Lọc cộng tác tìm mối liên hệ giữa những sản phẩm được các nhóm người dùng cùng quan tâm.'],['eye','Cảm hứng tương đồng','CLIP so sánh đặc trưng ảnh và mô tả với những thiết kế bạn từng quan tâm.']].map(([name,title,text])=>`<div>${icon(name)}<section><h3>${title}</h3><p>${text}</p></section></div>`).join('')}<small>Khi chưa có đủ tín hiệu, VELA sử dụng tuyển chọn phổ biến và sở thích bạn đã chọn. Gợi ý là gợi mở để bạn khám phá; điểm xếp hạng không phải xác suất bạn sẽ yêu thích sản phẩm.</small></div>`,true);$('.modal').setAttribute('aria-label','Cách VELA gợi ý phong cách');}});
