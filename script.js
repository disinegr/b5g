const siteLoader=document.querySelector('#site-loader');
const loaderEnabled=window.B5G_EFFECTS?.loader!==false;
if(siteLoader&&loaderEnabled){
  const progressbar=siteLoader.querySelector('[role="progressbar"]');
  const segmentsRoot=siteLoader.querySelector('.site-loader__segments');
  const segmentCount=24;
  const segments=Array.from({length:segmentCount},()=>{
    const segment=document.createElement('span');
    segmentsRoot.append(segment);
    return segment;
  });
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimumDuration=reducedMotion?420:2300;
  const exitDuration=reducedMotion?80:1050;
  const startedAt=performance.now();
  let pageReady=document.readyState==='complete';
  let displayedProgress=0;

  window.addEventListener('load',()=>{pageReady=true;},{once:true});

  const paintLoader=value=>{
    displayedProgress=Math.max(displayedProgress,Math.min(1,value));
    const activeCount=Math.round(displayedProgress*segmentCount);
    segments.forEach((segment,index)=>segment.classList.toggle('is-active',index<activeCount));
    const percent=Math.round(displayedProgress*100);
    progressbar.setAttribute('aria-valuenow',String(percent));
    progressbar.setAttribute('aria-valuetext',`${percent}%`);
  };

  const finishLoader=()=>{
    paintLoader(1);
    siteLoader.classList.add('is-complete');
    const revealDelay=reducedMotion?0:180;
    window.setTimeout(()=>{
      document.documentElement.classList.add('hero-revealing');
      siteLoader.classList.add('is-leaving');
    },revealDelay);
    window.setTimeout(()=>document.documentElement.classList.add('site-ready'),revealDelay+(reducedMotion?0:720));
    window.setTimeout(()=>{
      siteLoader.hidden=true;
      document.documentElement.classList.remove('loader-active');
    },exitDuration+revealDelay);
    window.setTimeout(()=>document.documentElement.classList.remove('hero-intro-pending'),revealDelay+(reducedMotion?0:1950));
  };

  const advanceLoader=now=>{
    const elapsed=now-startedAt;
    const timedProgress=Math.min(.92,elapsed/minimumDuration*.92);
    paintLoader(timedProgress);
    if(pageReady&&elapsed>=minimumDuration){
      finishLoader();
      return;
    }
    requestAnimationFrame(advanceLoader);
  };

  requestAnimationFrame(advanceLoader);
}else if(siteLoader){
  siteLoader.hidden=true;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.documentElement.classList.add('hero-revealing');
    window.setTimeout(()=>document.documentElement.classList.add('site-ready'),reducedMotion?0:280);
    window.setTimeout(()=>document.documentElement.classList.remove('hero-direct-pending'),reducedMotion?0:1500);
  }));
}

const hero=document.querySelector('.hero');
const heroMedia=hero?.querySelector('.hero-media');
const heroVideo=heroMedia?.querySelector('video');
const heroNextSection=document.querySelector('.clients-section');
let refreshHeroMotion=()=>{};
if(hero){
  const variantRoot=document.documentElement;
  const variantPanels=[...hero.querySelectorAll('[data-hero-content]')];
  const variantButtons=[...hero.querySelectorAll('[data-hero-select]')];
  const alternateImages=[...hero.querySelectorAll('.hero-variant--two img[data-src]')];
  let requestedVariant=variantRoot.dataset.heroVariant==='2'?'2':'1';
  let alternateImagesReady;
  const loadAlternateImages=()=>{
    if(!alternateImagesReady){
      alternateImagesReady=Promise.all(alternateImages.map(image=>{
        image.src=image.dataset.src;
        return image.decode().catch(()=>{});
      }));
    }
    return alternateImagesReady;
  };
  const showHeroVariant=async (variant,updateUrl=false)=>{
    const next=variant==='2'?'2':'1';
    requestedVariant=next;
    if(next==='2'){
      hero.setAttribute('aria-busy','true');
      await loadAlternateImages();
      hero.removeAttribute('aria-busy');
      if(requestedVariant!==next)return;
    }else hero.removeAttribute('aria-busy');
    variantRoot.dataset.heroVariant=next;
    variantPanels.forEach(panel=>{
      const active=panel.dataset.heroContent===next;
      panel.inert=!active;
      panel.setAttribute('aria-hidden',String(!active));
    });
    variantButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.heroSelect===next)));
    refreshHeroMotion();
    if(updateUrl){
      const url=new URL(location.href);
      if(next==='2')url.searchParams.set('hero','2');
      else url.searchParams.delete('hero');
      try{history.replaceState(history.state,'',url.href)}catch{}
    }
  };
  variantButtons.forEach(button=>button.addEventListener('click',()=>showHeroVariant(button.dataset.heroSelect,true)));
  window.addEventListener('popstate',()=>showHeroVariant(new URLSearchParams(location.search).get('hero')));
  showHeroVariant(requestedVariant);
}
if(hero&&heroMedia&&heroNextSection){
  const heroMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let heroScrollFrame=0;
  const updateHeroScroll=()=>{
    heroScrollFrame=0;
    const viewport=Math.max(1,window.innerHeight);
    const progress=Math.max(0,Math.min(1,(viewport-heroNextSection.getBoundingClientRect().top)/viewport));
    const eased=progress*progress*(3-2*progress);
    hero.classList.toggle('hero-offscreen',progress>.95);
    hero.style.setProperty('--hero-scroll-y',`${(-18*eased).toFixed(2)}px`);
    hero.style.setProperty('--hero-scroll-scale',(1.015+.045*eased).toFixed(4));
    hero.style.setProperty('--hero-scroll-brightness',(1-.34*eased).toFixed(3));
    const fade=Math.max(0,1-Math.max(0,(progress-.18)/.52));
    hero.style.setProperty('--hero-scroll-opacity',fade.toFixed(3));
    const secondVariant=document.documentElement.dataset.heroVariant==='2';
    const titleProgress=heroMotion.matches?0:Math.max(0,Math.min(1,(progress-.08)/.54));
    const descriptionProgress=heroMotion.matches?0:Math.max(0,Math.min(1,progress/.3));
    hero.style.setProperty('--hero2-title-y',`${(-32*titleProgress).toFixed(2)}px`);
    hero.style.setProperty('--hero2-description-y',`${(-24*descriptionProgress).toFixed(2)}px`);
    hero.style.setProperty('--hero2-title-opacity',(1-titleProgress).toFixed(3));
    hero.style.setProperty('--hero2-description-opacity',(1-descriptionProgress).toFixed(3));
    if(heroVideo){
      if(heroMotion.matches||progress>.72||secondVariant)heroVideo.pause();
      else{
        const source=heroVideo.querySelector('source[data-src]');
        if(source&&!source.hasAttribute('src')){
          source.src=source.dataset.src;
          heroVideo.load();
        }
        if(heroVideo.paused)heroVideo.play().catch(()=>{});
      }
    }
  };
  const requestHeroScroll=()=>{if(!heroScrollFrame)heroScrollFrame=requestAnimationFrame(updateHeroScroll);};
  window.addEventListener('scroll',requestHeroScroll,{passive:true});
  window.addEventListener('resize',requestHeroScroll);
  heroMotion.addEventListener('change',requestHeroScroll);
  refreshHeroMotion=requestHeroScroll;
  updateHeroScroll();
}

const menu=document.querySelector('.menu');
const toggle=document.querySelector('.menu-toggle');
const content=document.querySelector('.menu-content');
function setMenu(open,returnFocus=false){
  menu.classList.toggle('is-open',open);
  document.documentElement.classList.toggle('menu-open',open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  content.inert=!open;
  const pageMain=document.querySelector('main');
  if(pageMain)pageMain.inert=open;
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
  if('IntersectionObserver'in window){
    const footerBlurObserver=new IntersectionObserver(entries=>{
      document.documentElement.classList.toggle('footer-in-view',entries[0].isIntersecting);
    },{threshold:0});
    footerBlurObserver.observe(footer);
  }
}

// A shared, restrained text entrance for every content section.
const scrollTextElements=[...document.querySelectorAll([
  'main h2',
  'main h3',
  'main p',
  '.project-copy > span',
  '.project-tags > span',
  '.site-footer nav a',
  '.footer-legal a'
].join(','))].filter(element=>!element.closest('.contact-dialog'));

if(scrollTextElements.length){
  const groupIndexes=new Map();
  scrollTextElements.forEach(element=>{
    const group=element.closest('section,footer,.project-card')||element.parentElement;
    const index=groupIndexes.get(group)||0;
    groupIndexes.set(group,index+1);
    element.classList.add('scroll-text');
    element.style.setProperty('--text-reveal-delay',`${Math.min(index,4)*.07}s`);
  });

  if('IntersectionObserver'in window){
    const textObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('is-text-visible');
        textObserver.unobserve(entry.target);
      });
    },{threshold:.12,rootMargin:'0px 0px -7% 0px'});
    scrollTextElements.forEach(element=>textObserver.observe(element));
  }else{
    scrollTextElements.forEach(element=>element.classList.add('is-text-visible'));
  }
}

const contactDialog=document.querySelector('.contact-dialog');
if(contactDialog){
  let contactTrigger=null,closing=false,closeTimer=0;
  const reducedContactMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const openContact=event=>{
    event.preventDefault();
    if(contactDialog.open)return;
    contactTrigger=event.currentTarget;
    setMenu(false);
    clearTimeout(closeTimer);
    closing=false;
    contactDialog.showModal();
    document.documentElement.classList.add('contact-open');
    requestAnimationFrame(()=>requestAnimationFrame(()=>contactDialog.classList.add('is-open')));
  };
  const closeContact=()=>{
    if(closing||!contactDialog.open)return;
    closing=true;
    contactDialog.classList.remove('is-open');
    document.documentElement.classList.remove('contact-open');
    closeTimer=window.setTimeout(()=>{
      contactDialog.close();
      closing=false;
      contactTrigger?.focus({preventScroll:true});
    },reducedContactMotion.matches?0:820);
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
