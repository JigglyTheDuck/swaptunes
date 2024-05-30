import "./swiper-select.css";
const template = () => `<!-- Custom Swipe Selector -->
<div class="swipe-selector padding-md">
    <ul class="selector-options">
        <!-- JavaScript will populate this list -->
    </ul>
</div>`;

const getScale = (distance) => {
  if (distance == 0) return 1;

  const absD = Math.abs(distance);

  return (1 / Math.log(absD + 1)) * 0.33;
};

const getTranslate = (distance) => {
  const absD = Math.abs(distance);

  const translate = Math.log(absD + 1) * 0.25;

  return distance < 0 ? -translate : translate;
};

const swiperSelect = (root, { currentIndex = 0, options, direction = "Y", onSelect }) => {
  const getCoord = (event) => {
    if (!event.clientX && (!event.touches?.length || event.touches?.length > 1))
      return null;

    const key = `client${direction}`;
    return event[key] || event.touches[0][key];
  };
  root.innerHTML = template();
  const container = document.querySelector(".selector-options");
  container.style.height = direction === "Y" ? `6rem` : `4rem`;
  options.forEach(({ option }) => {
    const li = document.createElement("li");
    li.textContent = option;
    container.appendChild(li);
  });

  update();

  let startCoord;
  function update() {
    // display 1-4 options to each side.

    Array.from(container.children).forEach((child, i) => {
      const distance = i - currentIndex;
      const absD = Math.abs(distance);
      child.style.opacity = 1 - absD * 0.25;
      child.style.transform = `translate${direction}(${
        (direction === "X" ? 100 : 150) * getTranslate(distance)
      }%) scale(${getScale(distance)})`;
    });
  }

  let hasChanged = false
  const start = (e) => {
      hasChanged = true;
    e.preventDefault();
    startCoord = getCoord(e);
  };
  const move = (e) => {
    e.preventDefault();
    if (!startCoord) return;
    const x = getCoord(e);
    const movement = x - startCoord;

    const shiftCount = Math.round(movement / 75);
    const candidate = currentIndex - shiftCount;
    if (shiftCount != 0 && candidate < options.length && candidate >= 0) {
      currentIndex = candidate;
      update();
      startCoord = x;
    }
    // updateSelected(targetIndex);
  };

  const end = (e) => {
    e.preventDefault();
    if (onSelect && hasChanged) {
      // we might want to change UX so that we need to swipe AND tap
      hasChanged = false
      onSelect(options[currentIndex].index, options[currentIndex].option);
    }
    /*
    currentIndex = Array.from(container.children).indexOf(
      document.querySelector(".selected")
    );*/
    startCoord = 0;
  };

  container.addEventListener("touchstart", start, { passive: false });
  container.addEventListener("mousedown", start, { passive: false });
  container.addEventListener("touchmove", move, { passive: false });
  container.addEventListener("mousemove", move, { passive: false });
  container.addEventListener("touchend", end);
  window.addEventListener("mouseup", end);
  //container.addEventListener("mouseleave", end);

  return () => {
    container.removeEventListener("touchstart", start, { passive: false });
    container.removeEventListener("mousedown", start, { passive: false });
    container.removeEventListener("touchmove", move, { passive: false });
    container.removeEventListener("mousemove", move, { passive: false });
    container.removeEventListener("touchend", end);
    window.removeEventListener("mouseup", end);
  };
};

export default swiperSelect;
