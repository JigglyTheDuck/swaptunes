import { useNavigate, useAutofocus } from "../../utils";
export const initializeForm = (form, _onsubmit) => {
  const elements = Array.from(form.children);
  const destroyNavigate = useNavigate(form);
  const autofocus = () => {
    elements[0].focus();
    elements[0].checked = true;
  };
  const destroyAutofocus = useAutofocus(autofocus);

  const onsubmit = (e) => {
    if (e) e.preventDefault();
    const data = new FormData(form).get("nav");

    _onsubmit(data, elements);
  };

  const onLabelClick = (e) => {
    if (e.target.tagName === "INPUT") return;
    const container =
      e.target.children.length === 0 ? e.target.parentElement : e.target;
    const input = container.children[0];

    if (input.disabled) return;
    input.checked = true;

    // need to wait for
    onsubmit();
  };

  for (const el of elements) {
    if (el.tagName !== "LABEL") continue;
    el.addEventListener("click", onLabelClick);
  }

  form.addEventListener("submit", onsubmit);
  return () => {
    destroyAutofocus();
    for (const el of elements) {
      if (el.tagName !== "LABEL") continue;
      el.removeEventListener("click", onLabelClick);
    }
    destroyNavigate();

    form.removeEventListener("submit", onsubmit);
  };
};
