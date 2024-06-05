import header from "../components/header";
import playBtn from "../components/playbtn";
import { Encoder } from "../modules/encoder";
import { Parser } from "../modules/parser";
import { route, checksum } from "../utils";
import { loadCompositions } from "../modules/storage";
// this will be all the historically created songs with jiggly
//
//
// users can go back and forth here and download for offline storage to listen to later

const trackTemplate = ({ id, name, isOriginal }) =>
  `<div class="stack gap-md nes-balloon padding-md">
  <div class="inline gap-sm align-center">
  <h3>${name}</h3>
  </div>
  <div class="inline gap-sm">
  <button id="jukebox__${id}_edit" class="nes-btn is-primary">edit</button>
  
  ${
    isOriginal
      ? `<button id="jukebox__${id}_open" class="nes-btn is-success">open</button>`
      : `<button id="jukebox__${id}_play" class="nes-btn is-success">play</button>`
  }
    </div>
  </div>`;

const template = (originalTracks, tracks) => `
${header({
  title: "Jukebox",
  description:
    originalTracks.length > 0
      ? ""
      : `<p>Songs created with Jiggly will appear here.</p>`,
})}
<div class="inline sm wrap gap-md">
    ${(originalTracks.length > 0 ? originalTracks : tracks)
      .map(trackTemplate)
      .join("")}
</div>
<p>You can find some compatible tunes sourced from <a href="https://github.com/pret/pokered/blob/master/audio/music/meeteviltrainer.asm" target="_blank" rel="noreferer">github</a>.</p>
`;

const source = "/samples";
const cache = {};
const fetchSong = (id) => {
  if (cache[id]) return Promise.resolve(cache[id]);

  return fetch(`${source}/${id}.asm`)
    .then((response) => response.text())
    .then((text) => {
      cache[id] = text;
    });
};

export default (root) => {
  const compositions = loadCompositions().map((c, i) => ({
    params: c.id,
    id: checksum(c.id),
    track: c.track,
    name: `TRACK ${checksum(c.id)}`,
    isOriginal: true,
  }));
  const songs = [
    { id: "ode", name: "SAMPLE 1" },
    { id: "twinkle", name: "SAMPLE 2" },
    { id: "random", name: "SAMPLE 3" },
  ];
  root.innerHTML = template(compositions, songs);

  const elements = (compositions.length > 0 ? compositions : songs).map(
    ({ id }) => ({
      openBtn: document.getElementById(`jukebox__${id}_open`),
      editBtn: document.getElementById(`jukebox__${id}_edit`),
      playBtn: document.getElementById(`jukebox__${id}_play`),
    })
  );

  const plays = [];

  if (compositions.length === 0) {
    for (let i = 0; i < songs.length; ++i) {
      //elements[i].playBtn.disabled = true;
      elements[i].editBtn.disabled = true;
      fetchSong(songs[i].id).then(() => {
        elements[i].editBtn.disabled = false;
        plays.push(playBtn(elements[i].playBtn, () => cache[songs[i].id]));
        elements[i].editBtn.onclick = () => {
          new Encoder()
            .encode(cache[songs[i].id])
            .then((previewTrack) => route("composer", { previewTrack }));
        };
        // _playBtn(elements[i].playBtn, () => cache[songs[i].id]);
      });
    }
  } else {
    for (const [i, composition] of compositions.entries()) {
      elements[i].editBtn.onclick = () => {
        route("composer", { previewTrack: composition.track });
      };
      elements[i].openBtn.onclick = () => {
        const url = new URL(`${window.location.host}?${composition.params}`);
        route(
          url.hash.slice(1),
          Object.fromEntries(url.searchParams.entries())
        );
      };
    }
  }
  return () => {
    plays.map((p) => p());
  };
};
