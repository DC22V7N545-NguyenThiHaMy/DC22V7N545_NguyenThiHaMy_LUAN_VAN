/* One message at a time, rotating upward without moving the header. */
(() => {
  const bar=document.querySelector('.announcement-vertical');
  if(!bar)return;
  const link=bar.querySelector('.announcement-ticker');
  const line=bar.querySelector('.announcement-line');
  const copy=bar.querySelector('.announcement-copy');
  const toggle=bar.querySelector('.announcement-toggle');
  const label=bar.querySelector('.announcement-message-label');
  const detail=bar.querySelector('.announcement-detail');
  const cta=bar.querySelector('.announcement-message-cta');
  const counter=bar.querySelector('.announcement-counter>b');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const messages=[
    {label:'QUYỀN LỢI CỦA BẠN',text:'Miễn phí vận chuyển từ 999.000đ',detail:'Thêm niềm vui trong tủ đồ',cta:'Xem chính sách',href:'/thong-tin/giao-hang'},
    {label:'MUA SẮM THẢNH THƠI',text:'An tâm đổi trả trong vòng 30 ngày',detail:'Thoải mái chọn điều bạn yêu',cta:'Tìm hiểu thêm',href:'/thong-tin/giao-hang'},
    {label:'CẢM HỨNG MỚI',text:'Chào một mùa phong cách rất riêng',detail:'Khám phá tuyển chọn thu–đông của VELA',cta:'Xem bộ sưu tập',href:'/san-pham?sort=newest'},
    {label:'DÀNH RIÊNG CHO BẠN',text:'Một tủ đồ ngày càng hiểu gu của bạn',detail:'Gợi ý từ những điều bạn quan tâm',cta:'Tìm gu của tôi',href:'/danh-rieng-cho-ban'},
    {label:'TÌM BẰNG HÌNH ẢNH',text:'Thấy một thiết kế khiến bạn rung động?',detail:'Tìm những lựa chọn đồng điệu từ một tấm ảnh',cta:'Thử khám phá',href:'/tim-bang-anh'},
    {label:'GÓC NHỎ PHONG CÁCH',text:'Giữ những món đồ bạn yêu ở lại lâu hơn',detail:'Cẩm nang phối đồ & chăm sóc tủ đồ',cta:'Đọc cảm hứng',href:'/cam-hung'}
  ];
  let index=0,timer=null,paused=false,hovered=false,focused=false,busy=false;
  function stop(){clearInterval(timer);timer=null;}
  async function next(){
    if(busy||reduced.matches||paused||hovered||focused||document.hidden)return;
    busy=true;
    try{
      await line.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-22px)',opacity:0}],{duration:300,easing:'ease-in',fill:'forwards'}).finished;
      index=(index+1)%messages.length;
      copy.textContent=messages[index].text;
      label.textContent=messages[index].label;
      detail.textContent=messages[index].detail;
      cta.textContent=messages[index].cta;
      counter.textContent=String(index+1).padStart(2,'0');
      link.setAttribute('href',messages[index].href);
      line.getAnimations().forEach(animation=>animation.cancel());
      await line.animate([{transform:'translateY(22px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'}).finished;
    }finally{busy=false;}
  }
  function start(){stop();if(!paused&&!hovered&&!focused&&!document.hidden&&!reduced.matches)timer=setInterval(next,4000);}
  toggle.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'▷':'Ⅱ';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Tiếp tục dòng thông báo':'Tạm dừng dòng thông báo');start();});
  bar.addEventListener('mouseenter',()=>{hovered=true;stop();});
  bar.addEventListener('mouseleave',()=>{hovered=false;start();});
  bar.addEventListener('focusin',()=>{focused=true;stop();});
  bar.addEventListener('focusout',()=>{focused=bar.contains(document.activeElement);start();});
  document.addEventListener('visibilitychange',start);
  reduced.addEventListener('change',start);
  start();
})();
