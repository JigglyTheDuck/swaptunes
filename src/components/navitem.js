import { href } from "../utils";
export default ({ label, to, disabled, id, external }) => `<a class="nes-text${
  disabled ? " is-disabled" : ""
}" href="${external ? to : href(`#${to}`)}"${external ? ' target="_blank" rel="noreferer"' : ''}>
  <input
${disabled ? "disabled" : ""} ${id ? `id="${id}"` : ""}
    value="${to}"
    type="radio"
    class="nes-radio"
    name="nav"
  />
  <span>${label}</span>
</a>`;

export const formNavItem = ({
  label,
  value,
  disabled,
  checked,
  id,
}) => `<label class="nes-text${disabled ? " is-disabled" : ""}">
  <input
${disabled ? "disabled" : ""} ${id ? `id="${id}"` : ""}
    value="${value}"
    type="radio"
    class="nes-radio"
    name="nav"
    ${checked ? 'checked':''}
  />
  <span>${label}</span>
</label>`;
/*
export default ({ label, to, disabled, id }) => `<label class="nes-text${
  disabled ? " is-disabled" : ""
}">
  <input
${disabled ? "disabled" : ""} ${id ? `id="${id}"` : ""}
    value="${to}"
    type="radio"
    class="nes-radio"
    name="nav"
  />
  <span>${label}</span>
</label>`;*/
