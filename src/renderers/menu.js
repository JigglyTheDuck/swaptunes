import { href } from "../utils";
import navItem from "../components/navitem";
import { useAutofocus, useNavigate } from "../utils";
import { getSetting } from "../modules/settings";
const template = () => `<div class="menu stack gap-lg">
<header>
  <h3 class="nes-text bg-secondary padding-md is-error">The blockchain composer</h3>
</header>
<form id="menu-nav" class="menu-nav stack gap-md">
    ${navItem({
      to: "app",
      label: "LAUNCH APP",
      id: "menu-initial-focus",
    })}
    ${navItem({
      to: "composer",
      label: "Composer",
    })}
    ${navItem({
      to: "jukebox",
      label: "Jukebox",
    })}
    ${navItem({
      to: "settings",
      label: "Settings",
    })}
    ${navItem({
      to: "dao",
      label: "DAO",
      disabled: true
    })}
    ${navItem({
      to: "help",
      label: "Help",
    })}
    <button class="hidden"></button>
</form>
<footer class="inline justify-end">
        <button disabled id="install-btn" class="nes-btn is-success is-disabled">Install</button>
</footer>
</div>
`;

export default (root, fromHash) => {
  root.innerHTML = template();
  const destroyNavigate = useNavigate(document.getElementById("menu-nav"));
  const elements = Array.from(document.getElementsByName("nav"));
  const installBtn = document.getElementById("install-btn");
  const toFocus =
    elements.find((el) => el.parentElement?.href?.includes(fromHash)) ||
    elements[0];

  const autofocus = () => {
    toFocus.checked = true;
    toFocus.focus();
  };

  let deferredPrompt;

  const destroyAutofocus = useAutofocus(autofocus);
  const onBeforeInstall = (e) => {
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    installBtn.classList.remove("is-disabled");
  };

  const onInstall = () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
      deferredPrompt = null;
    });
  };

  installBtn.addEventListener("click", onInstall);
  window.addEventListener("beforeinstallprompt", onBeforeInstall);

  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    installBtn.removeEventListener("click", onInstall);
    destroyNavigate();
    destroyAutofocus();
  };
};
