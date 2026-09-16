const menu=document.querySelector('.menu');
const toggle=document.querySelector('.menu-toggle');
const content=document.querySelector('.menu-content');
function setMenu(open,returnFocus=false){
  menu.classList.toggle('is-open',open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  content.inert=!open;
  if(returnFocus)toggle.focus({preventScroll:true});
}
toggle.addEventListener('click',()=>setMenu(!menu.classList.contains('is-open')));
document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('is-open'))setMenu(false,true);});
menu.addEventListener('focusout',event=>{if(event.relatedTarget&&!menu.contains(event.relatedTarget))setMenu(false);});
content.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});

const stackSection=document.querySelector('.stack-section');
if(stackSection){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let stackFrame=0;
  const updateStack=()=>{
    stackFrame=0;
    const rect=stackSection.getBoundingClientRect();
    const viewport=window.innerHeight;
    const progress=Math.max(0,Math.min(1,(viewport-rect.top)/(viewport+rect.height)));
    const travel=reducedMotion.matches?0:(progress-.5)*620;
    stackSection.style.setProperty('--stack-shift',`${travel}px`);
    stackSection.style.setProperty('--stack-shift-reverse',`${-travel}px`);
    if(progress>.04)stackSection.classList.add('is-visible');
  };
  const requestStackUpdate=()=>{
    if(!stackFrame)stackFrame=requestAnimationFrame(updateStack);
  };
  window.addEventListener('scroll',requestStackUpdate,{passive:true});
  window.addEventListener('resize',requestStackUpdate);
  reducedMotion.addEventListener('change',requestStackUpdate);
  updateStack();
}

const projectsSection=document.querySelector('.projects-section');
if(projectsSection){
  const cards=projectsSection.querySelectorAll('.project-stage');
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
    },{threshold:.08});
    cards.forEach(card=>observer.observe(card));
  }else{cards.forEach(card=>card.classList.add('is-visible'));}
}

const footer=document.querySelector('.site-footer');
if(footer){
  if('IntersectionObserver'in window){
    const footerObserver=new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting)return;
      footer.classList.add('is-visible');
      footerObserver.disconnect();
    },{threshold:.12});
    footerObserver.observe(footer);
  }else{
    footer.classList.add('is-visible');
  }
}

const contactDialog=document.querySelector('.contact-dialog');
if(contactDialog){
  let contactTrigger=null,previousOverflow='',motionFrame=0,closing=false,progress=0;
  const panel=contactDialog.querySelector('.contact-panel');
  const paintContact=()=>{
    panel.style.transform=`translate3d(${(1-progress)*(panel.offsetWidth+24)}px,0,0)`;
    contactDialog.style.backgroundColor=`rgba(0,0,0,${progress*.55})`;
  };
  const moveContact=(target,done)=>{
    cancelAnimationFrame(motionFrame);
    const from=progress;
    const duration=target?850:550;
    let start=null;
    const tick=time=>{
      if(start===null)start=time;
      const t=Math.min(1,(time-start)/duration);
      const eased=t*t*(3-2*t);
      progress=from+(target-from)*eased;
      paintContact();
      if(t<1)motionFrame=requestAnimationFrame(tick);
      else done?.();
    };
    motionFrame=requestAnimationFrame(tick);
  };
  const openContact=event=>{
    event.preventDefault();
    if(contactDialog.open)return;
    contactTrigger=event.currentTarget;
    setMenu(false);
    previousOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
    closing=false;
    progress=0;
    panel.style.transform='translate3d(calc(100% + 24px),0,0)';
    contactDialog.style.backgroundColor='rgba(0,0,0,0)';
    contactDialog.showModal();
    paintContact();
    moveContact(1);
  };
  const closeContact=()=>{
    if(closing||!contactDialog.open)return;
    closing=true;
    moveContact(0,()=>{
      contactDialog.close();
      document.documentElement.style.overflow=previousOverflow;
      closing=false;
      contactTrigger?.focus({preventScroll:true});
    });
  };
  document.querySelectorAll('.hero-contact,.footer-contact').forEach(button=>{button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',openContact);});
  contactDialog.querySelector('.contact-close').addEventListener('click',closeContact);
  contactDialog.addEventListener('cancel',event=>{event.preventDefault();closeContact();});
  contactDialog.addEventListener('click',event=>{if(event.target===contactDialog)closeContact();});
  contactDialog.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();
    contactDialog.querySelector('.contact-status').textContent='Отправка пока не подключена. Данные остаются в форме.';
  });
}

const clientsSection=document.querySelector('.clients-section');
if(clientsSection){
  const logos=[...clientsSection.querySelectorAll('.client-logo')];
  const clientMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let clientsFrame=0;
  function updateClients(){
    clientsFrame=0;
    const height=window.innerHeight;
    logos.forEach(logo=>{
      const rect=logo.getBoundingClientRect();
      const proximity=Math.max(0,1-Math.abs(rect.top+rect.height/2-height/2)/(height*.48));
      logo.style.setProperty('--client-opacity',clientMotion.matches?1:(.18+.82*proximity).toFixed(3));
      logo.style.setProperty('--client-scale',clientMotion.matches?1:(.94+.06*proximity).toFixed(3));
    });
  }
  function requestClients(){if(!clientsFrame)clientsFrame=requestAnimationFrame(updateClients);}
  window.addEventListener('scroll',requestClients,{passive:true});
  window.addEventListener('resize',requestClients);
  clientMotion.addEventListener('change',requestClients);
  updateClients();
}

// Expand the image with scroll; reverse naturally when scrolling back up.
const aboutPhoto = document.querySelector('.about-photo-scroll');
if (aboutPhoto) {
  const photoMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const photoMobile = matchMedia('(max-width:809px)');
  let photoFrame = 0;
  const updatePhoto = () => {
    photoFrame = 0;
    if (photoMotion.matches) return;
    const rect = aboutPhoto.getBoundingClientRect();
    const travel = Math.max(1, rect.height - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / (travel * .85)));
    const eased = progress * progress * (3 - 2 * progress);
    const initialHeight = photoMobile.matches ? 65 : 76;
    aboutPhoto.style.setProperty('--photo-inset', `${(photoMobile.matches ? 5 : 6) * (1 - eased)}%`);
    aboutPhoto.style.setProperty('--photo-radius', `${24 * (1 - eased)}px`);
    aboutPhoto.style.setProperty('--photo-height', `${initialHeight + (100 - initialHeight) * eased}svh`);
  };
  const requestPhoto = () => { if (!photoFrame) photoFrame = requestAnimationFrame(updatePhoto); };
  window.addEventListener('scroll', requestPhoto, {passive:true});
  window.addEventListener('resize', requestPhoto);
  photoMotion.addEventListener('change', requestPhoto);
  updatePhoto();
}
