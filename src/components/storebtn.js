import { storeComposition } from "../modules/storage";
import { Encoder } from "../modules/encoder";

export default (button, genComp, onStore) => {
  let label = button.innerText;
  button.onclick = () => {
    const track = genComp();
    const url = new URL(window.location.href);
    url.searchParams.delete('previewTrack')
    new Encoder().encode(track).then((encoded) => {
      storeComposition({
        id: `${url.searchParams}${url.hash}`,
        track: encoded,
      });
      button.classList.add("is-disabled");
      button.innerText = "stored!";
      if (onStore) onStore(comp);
      setTimeout(() => {
        button.innerText = label;
        button.classList.remove("is-disabled");
      }, 2000);
    });
  };
};
