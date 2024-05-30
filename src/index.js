const body = document.body;
const encodedNotes = {
  eighth: `R0lGODlhCQALAIAAAAAAAAAAACH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEZAAEALAAAAAAJAAsAAAITjIFpAcub1HFtwovflVF1D0JNAQA7`,
  dblEighth: `R0lGODlhCAALAIABAAAAAP///yH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEZAAEALAAAAAAIAAsAAAIRjIGmmBvsHojT1bjagVlvZRQAOw==`,
  quarter: `R0lGODlhBAALAIAAAAAAAAAAACH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEZAAEALAAAAAAEAAsAAAIMjGGBl6sNgZwUyVAAADs=`,
};

const encodedDuck = `R0lGODlhJAAkAOMIAAAAAB1Oi0WAymOk9fmVQPvVcfvqgv/83////////////////////////////////yH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEKAA8ALAAAAAAkACQAAAT+8MlJ6wM42805GGCIWRnQbV+oDuaFiWeVrqAgvOIYS4BA1zgWJtDa9XwrWxAQaBaNNpVyWTAQd5RjbaoCVA2GJ9Q2nbG+4DCWR74FBzc0WBw7ZqTetL5kvOPRAAhpBIR0JFpbeWkYg4VjbXF6kgaOdWUZcpOUTzpZZEwFoZmalV4FYnZNoZqTfBernJejrSSrYUUaPLOLtZmdMqxzvZolJcHCMrbHy2mnyYDF0YzBzhOmi4Rg2ZQE2tOT1bqA2+Td3ADUuMroBgcHYO7w7+3s4Jzr7fPx+fD1kuGvxmkzVy4MK4DXFg1ceC7dsz36Is45CDCgHEb74vn7V9GiJGkdG/WEMuSRmSZRJF2I2nUSZZ+VMGOu/FUHpE2SEQAAOw==`;

const encodedSingingDuck = `R0lGODlhJAAkAOMIAAAAAB1Oi0WAymOk9fmVQPvVcfvqgv/83////////////////////////////////yH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEKAA8ALAAAAAAkACQAAAT+8MlJ6wM42805GGCIWRnQbV+oDuaFiWeVrqAgvOIYS4BA1zgWJtDa9XwrWxAQaBaNNpVyWTAQd5RjbaoCVA2GJ9Q2nbG+4DCWR74FBzc0WBw7ZqTetJ7eKSXzcwhpfB5aW4BzAGkEhCRtZIh6i4xjJRhykmAEmy06WZABBaKYmQacJl4FYnZNoqWZJTyuT3YZpLAkrmFFGrKvc7mYnjK/ajK6kpYZxcZZyMzQqsdoytWKv9ITqYObmgTemhiv2bLU3abf6N7XpeTbc2AHB/HzBvLx7JLkF8iK9/b1/h3Ip2ffuzDpzin8RjCNwWfXFq7DtgpiwIvw2u3jB9EfxoYjDjdyFFYNm8hyt6AZGNXo0iiVYEadlJFKps2boobVscaTUAQAOw==
`;

const encodedWater = `R0lGODlhEAAEAIABAF24/////yH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEKAAEALAAAAAAQAAQAAAIPjAOnqQh8HnTUPCqjhK8AADs=`;

const animation = {
  previousPosition: 0,
  nextNoteProbability: 0.05,
  isRendering: false,
  isMoving: false,
  lastRender: 0,
};

const noteTypes = ["quarter", "eighth", "dblEighth"];
const images = {
  water: new Image(),
  duck: new Image(),
  singingDuck: new Image(),
  notes: {
    eighth: new Image(),
    dblEighth: new Image(),
    quarter: new Image(),
  },
};

const scene = {
  notes: [],
  dimensions: [0, 0],
  pixelSize: 0,
  flowDirection: 1,
  flowSpeed: 0,
};

const canvas = document.getElementById("background");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

const renderFrame = (forceRefresh) => {
  const position = window.scrollY;

  canvas.height = scene.dimensions[1];
  canvas.width = scene.dimensions[0];

  const isSinging = Math.sin(position / (window.innerHeight / 4)) < -0.2;

  const duckY = Math.floor(
    10 * Math.abs(Math.sin(position / (window.innerHeight / 4)))
  );
  const offset = Math.floor(position / scene.flowSpeed) % 8;

  const x = position / scene.flowSpeed - images.duck.width;

  if (animation.isMoving) {
    if (Math.random() < animation.nextNoteProbability) {
      animation.nextNoteProbability = 0.001;
      scene.notes.push({
        note: noteTypes[Math.floor(Math.random() * noteTypes.length)],
        // get duck's mouth.
        position: [
          x + (animation.flowDirection === 1 ? images.duck.width : 0),
          images.duck.height + duckY,
        ],
      });
    } else {
      animation.nextNoteProbability += 0.0005;
    }
  }

  const newNotes = [];
  for (const note of scene.notes) {
    if (note.position[1] < 0) continue;
    ctx.drawImage(images.notes[note.note], note.position[0], note.position[1]);
    note.position[0] += Math.random() < 0.5 ? -1 : 1;
    note.position[1] -= Math.random() < 0.4 ? 1 : 0;
    newNotes.push(note);
  }

  scene.notes = newNotes;

  for (
    let x = -scene.dimensions[0];
    x < scene.dimensions[0] + 1;
    x += images.water.width
  ) {
    ctx.drawImage(images.water, x - offset, 2 * images.duck.height - 2);
  }

  ctx.save();

  if (animation.flowDirection === -1) {
    ctx.translate(canvas.width, 0);

    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    isSinging ? images.singingDuck : images.duck,
    animation.flowDirection === -1
      ? scene.dimensions[0] - x - images.duck.width
      : x,
    images.duck.height + duckY
  );

  ctx.restore();

  //ctx.drawImage(images.duck, 30, 30);

  if (forceRefresh !== true && position === animation.previousPosition) {
    animation.isMoving = false;
    if (Date.now() - animation.lastRender < 3000)
      requestAnimationFrame(renderFrame);
    else {
      animation.isRendering = false;
    }
    return;
  }

  animation.lastRender = Date.now();
  animation.isRendering = true;
  animation.isMoving = true;

  animation.flowDirection = position - animation.previousPosition > 0 ? 1 : -1;
  animation.previousPosition = position;

  requestAnimationFrame(renderFrame);
};

const loadImage = (img, encodedSrc) =>
  new Promise((r) => {
    img.onload = r;
    img.src = `data:image/png;base64,${encodedSrc}`;
  });

let previousWidth = 0;
const analyzeWindow = () => {
  const width = window.innerWidth;
  if (Math.abs(width - previousWidth) < 50) return;
  previousWidth = width;

  const height = window.innerHeight;
  const targetSceneWidth = height > width ? 128 : Math.ceil(width / 5);
  scene.pixelSize = Math.ceil(width / targetSceneWidth);
  const pixelHeight = images.duck.height * 3;

  scene.flowSpeed = Math.floor(
    (document.body.scrollHeight - height) /
      (targetSceneWidth + images.duck.width)
  );
  scene.dimensions = [targetSceneWidth, pixelHeight];

  canvas.style.height = `${scene.pixelSize * pixelHeight}px`;
  canvas.style.width = `${scene.pixelSize * targetSceneWidth}px`;

  if (!animation.isRendering) renderFrame(true);
};

Promise.all([
  loadImage(images.water, encodedWater),
  loadImage(images.duck, encodedDuck),
  loadImage(images.singingDuck, encodedSingingDuck),
  loadImage(images.notes.eighth, encodedNotes.eighth),
  loadImage(images.notes.dblEighth, encodedNotes.dblEighth),
  loadImage(images.notes.quarter, encodedNotes.quarter),
]).then(() => {
  window.addEventListener("resize", analyzeWindow);
  window.addEventListener("scroll", () => {
    if (!animation.isRendering) renderFrame(true);
  });
  analyzeWindow();
});

const app = `<main class="nes-container with-title">
      <p class="title">Jiggly (beta)</p>
      <div id="output" class="stack gap-lg"></div>
    </main>
    <button class="hidden nes-btn is-error" id="globalStopBtn">
      Stop playback
    </button>
    <canvas id="visualization"></canvas>`;

const buttons = Array.from(document.getElementsByClassName("open-app"));

const openApp = () => {
  body.style.opacity = 0;
  body.classList.remove("stack", "gap-xl", "align-center");
  body.classList.add("padding-xl");
  body.children[0].remove();
  body.innerHTML = app;

  const scriptTag = document.createElement("script");

  if (import.meta.env.DEV) {
    scriptTag.type = "module";
    scriptTag.src = "/src/main.js";
  } else {
    const styleTag = document.createElement("link");
    styleTag.rel = "stylesheet";
    styleTag.href = "/assets/app.css";
    document.head.appendChild(styleTag);
    scriptTag.src = "/assets/app.js";
  }

  body.appendChild(scriptTag);

  scriptTag.onload = () => {
    document.getElementById("home-styles").remove();
    const url = new URL(window.location.href);
    url.hash = url.hash || `#menu`;

    window.history.pushState(null, "", url.toString());

    window.dispatchEvent(
      new HashChangeEvent("hashchange", {
        oldURL: window.location.href,
        newURL: url,
      })
    );
  };
};

for (const button of buttons) {
  button.onclick = openApp;
}

if (new URL(window.location.href).hash) openApp();
