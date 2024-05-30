import { set } from "../modules/clipboard";

const copyToClipBoard = (toCopy) => {
  // set(toCopy);
  try {
    return navigator.clipboard
      .writeText(toCopy)
      .then(() => true)
      .catch((e) => false);
  } catch (e) {
    return Promise.resolve(false);
  }
};
export default (button, genText, onCopy) => {
  let label = button.innerText;
  button.onclick = () => {
    const text = genText();
    copyToClipBoard(text).then((isSuccess) => {
      //if (isSuccess) {
      button.classList.add("is-disabled");
      button.innerText = "copied!";
      if (onCopy) onCopy(text);
      setTimeout(() => {
        button.innerText = label;
        button.classList.remove("is-disabled");
      }, 2000);
      //}
    });
  };

  return () => {
    button.onclick = null;
  };
};
