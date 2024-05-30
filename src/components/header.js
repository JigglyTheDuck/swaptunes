import { href } from "../utils";
const menuButton = () => `
        <a href="${href(
          "#menu"
        )}" id="back-to-menu" class="nes-btn is-error" tabindex="0">
          menu
        </a>
`;
const renderWithDescription = (title, description) => `
<header class="stack gap-md">
<div class="inline justify-space-between gap-md align-center">
  <div id="header__status">
    <h3>${title}</h3>
  </div>
  ${menuButton()}
  </div>
  <p>${description}</p>
</header>
`;
const renderWithoutDescription = (
  title,
  loading
) => `<header class="inline ${loading ? 'sm':''} justify-space-between gap-md align-start">
  <div id="header__status" class="self-center">
    <h3 class="${loading ? "loading" : ""}">${title}</h3>
  </div>
  ${menuButton()}
</header>
`;
export default ({ title, description, loading }) =>
  description
    ? renderWithDescription(title, description)
    : renderWithoutDescription(title, loading);
