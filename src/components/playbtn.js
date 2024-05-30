import * as gb from "../modules/gameboy-sound";
import { digestSong } from "../modules/digestSong";
import { watchSetting, unwatchSetting } from "../modules/settings";
import faviconFrames from "../components/favicon";

let latestCallback = null;

let close, playAll, changeUserVolume, unwatch;

// TODO: there is a horrible leak here somewhere
function reloadContext() {
  if (changeUserVolume) unwatchSetting("volume", changeUserVolume);
  if (close) close();
  const playback = gb.allow(document.getElementById("visualization"));
  close = playback.close;
  playAll = playback.playAll;
  changeUserVolume = (v) => playback.changeUserVolume((v - 2) / 2);
  watchSetting("volume", changeUserVolume);
}

reloadContext();

export const _playBtn = (button, getTrack, hooks) => {
  let label = button.innerText;
  button.type = "button";

  button.classList.add("nes-btn");
  const favicon = document.querySelector("link[rel~='icon']");
  const onclick = async () => {
    document.body.style.marginBottom = "16vh";
    const globalStopBtn = document.getElementById("globalStopBtn");
    const canvas = document.getElementById("visualization");
    if (latestCallback) latestCallback();
    let isPlaying = true;
    const updateFavicon = (frame = 0) => {
      favicon.href = "data:image/png;base64," + faviconFrames[frame];

      setTimeout(() => {
        if (isPlaying) updateFavicon((frame + 1) % faviconFrames.length);
      }, 200);
    };

    // prepare visualization
    canvas.classList.add("active");
    button.disabled = true;
    button.classList.add("is-disabled");
    button.innerText = "...";
    await new Promise((r) => setTimeout(r, 100));
    updateFavicon();

    // favicon.href = "/favicon-active.gif";
    const ctx = await playAll(digestSong(getTrack()));
    if (hooks?.onPlay) hooks.onPlay()
    globalStopBtn.classList.remove("hidden");
    button.disabled = false;
    button.classList.remove("is-disabled");
    button.innerText = "stop";
    button.classList.add("is-error");
    latestCallback = async () => {
      if (hooks?.onStop) hooks.onStop();
      document.body.style.marginBottom = "0";
      latestCallback = null;
      isPlaying = false;
      canvas.classList.remove("active");
      updateFavicon();
      button.onclick = onclick;
      button.innerText = label;
      globalStopBtn.classList.add("hidden");
      button.classList.remove("is-error");
      await new Promise((r) => setTimeout(r, 100));
      reloadContext();
    };
    globalStopBtn.onclick = latestCallback;
    button.onclick = latestCallback;
    button.focus();
  };

  button.onclick = onclick;

  return () => {
    button.onclick = null;
  };
};

export default _playBtn;
