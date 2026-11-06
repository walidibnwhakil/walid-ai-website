const previews = new IntersectionObserver(entries => {
  for (const {target, isIntersecting} of entries) {
    target.classList.toggle("in-view", isIntersecting);
  }
}, {threshold: 0.35});

document.querySelectorAll(".preview").forEach(preview => previews.observe(preview));
