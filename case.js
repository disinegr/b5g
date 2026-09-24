const chapters=[...document.querySelectorAll('[data-chapter]')];
const galleryGroups=[...document.querySelectorAll('[data-gallery-chapter]')];
if(chapters.length&&galleryGroups.length&&'IntersectionObserver'in window){
  const activeChapter=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    const id=visible.target.dataset.galleryChapter;
    chapters.forEach(chapter=>chapter.classList.toggle('is-active',chapter.dataset.chapter===id));
  },{rootMargin:'-25% 0px -35% 0px',threshold:[0,.1,.25,.5]});
  galleryGroups.forEach(group=>activeChapter.observe(group));
}
