// Carousel accessible avec autoplay, dots et navigation clavier
export function initCarousel(root, { interval = 5000 } = {}) {
  const slides = Array.from(root.querySelectorAll('.carousel__slide'));
  const dots = Array.from(root.querySelectorAll('.carousel__dot'));
  const prevBtn = root.querySelector('.carousel__control--prev');
  const nextBtn = root.querySelector('.carousel__control--next');

  if (slides.length === 0) return;

  let current = 0;
  let timer = null;

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.setAttribute('data-active', String(i === current)));
    dots.forEach((dot, i) => dot.setAttribute('data-active', String(i === current)));
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(next, interval);
  }
  function stopAutoplay() {
    if (timer) clearInterval(timer);
  }

  prevBtn?.addEventListener('click', () => { prev(); startAutoplay(); });
  nextBtn?.addEventListener('click', () => { next(); startAutoplay(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); startAutoplay(); }));

  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', startAutoplay);

  show(0);
  startAutoplay();
}
