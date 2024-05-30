let _compositions = [];

const store = () => {
  try {
    localStorage.setItem("compositions", JSON.stringify(_compositions));
  } catch (e) {}
};

export const storeComposition = (composition) => {
  const compositions = loadCompositions();
  compositions.push(composition);
  _compositions = compositions;
  store();
};

export const removeComposition = (compositionIndex) => {
  const compositions = loadCompositions();
  compositions.push(composition);
  compositions.splice(compositionIndex, 1);
  _compositions = compositions;
  store();
};

export const loadCompositions = () => {
  try {
    _compositions = JSON.parse(localStorage.getItem("compositions")) || [];
  } catch (e) {
    _compositions = [];
  }

  return _compositions;
};
