import header from "../components/header";
import navItem from "../components/navitem";
import { useNavigate } from "../utils";
import { useAutofocus } from "../utils";

const helpHomeTemplate = () => `
  ${header({ title: "Help" })}

  <form id="menu-nav" class="menu-nav stack gap-md">
    ${navItem({
      to: "help/intro",
      label: "Get started",
    })}
    ${navItem({
      to:
        "https://github.com/bastardastronaut/swaptunes/blob/master/docs/commands.md",
      label: "Composer",
      external: true,
    })}
    ${navItem({
      to: "help/voting",
      label: "Trade & Vote",
    })}
    ${navItem({
      to:
        "https://github.com/bastardastronaut/swaptunes/blob/master/docs/whitepaper.md",
      label: "Whitepaper",
      external: true,
    })}
    ${navItem({
      to:
        "https://github.com/bastardastronaut/swaptunes/blob/master/docs/whitepaper.md",
      label: "MIDI parser",
      external: true,
    })}
    ${navItem({
      to: "",
      label: "Back",
    })}
    <button class="hidden"></button>
  </form>
`;

const template = () => `
${header({ title: "Instructions" })}
      <p class="text">
        To vote, simply add tokens to the liquidity pool. Either by selling or adding liquidity (Uniswap V2 WETH/GLY).
        You cast your vote by specifying the fractional values in your trade (number after decimal point).</p>
      <p class="text"> - selling 10.01 GLY gives you 10 votes to the first option, 10.02 to the second option. and so on. </p>
      <p class="text">
        Any other trade removes votes from the most popular one and creates noise.
      </p>
      <p class="text">
        If the option you voted for gets selected you can access your rewards by voting again in the next segment.
      </p>
      <p class="text">
        You can vote multiple times in one segment but only your latest one will be considered for rewards.
        More details in the <a href="https://github.com/bastardastronaut/swaptunes/blob/master/docs/whitepaper.md" target="_blank" noreferer>whitepaper</a>.
      </p>
`;

const introTemplate = () => `
${header({ title: "Get started" })}
<p>You can play around with the composer to create music straight away. (refer to the sound command documentation for more information).</p>

<p>To participate in the community composition, get yourself some tokens and trade.</p>
`;

const composerTemplate = () => `
${header({ title: "Composer" })}
<p>Create music in the composer, or experiment with the samples provided in the jukebox.</p>
<h3>Composer commands</h3>
<p>tempo: Adjusts the speed at which your music composition plays.</p>
<p>duty_cycle: Alters the square wave's duty cycle, changing the timbre of notes by adjusting how much of the waveform is high versus low.</p>
<p>octave: Changes the pitch range of the notes, enabling compositions to span across different octaves.</p>
<p>note: Specifies the pitch of the notes to be played.</p>
<p>rest: Introduces pauses in your composition, crucial for rhythm and phrasing.</p>
<p>note_type: Controls the waveform type used in sound generation, affecting the character and texture of each note played.</p>
<p>sound_loop: Allows for repeating sequences of notes, creating loops that are essential for building complex compositions.</p>
<p>sound_ret: Ends the current channel.</p>
`;

const getTemplate = (hash) => {
  switch (hash) {
    case "#help":
      return helpHomeTemplate();
    case "#help/intro":
      return introTemplate();
    case "#help/composition":
      return composerTemplate();
    case "#help/gly":
    case "#help/voting":
      return template();
    case "#help/rewards":
      return template();
  }
};

export default (root) => {
  root.innerHTML = getTemplate(location.hash);

  const elements = Array.from(document.getElementsByName("nav"));
  const destroyNavigate = elements.length
    ? useNavigate(document.getElementById("menu-nav"))
    : () => null;
  const autofocus = () => {
    const el = elements.length
      ? elements[0]
      : document.getElementById("back-to-menu");
    el.focus();
    el.checked = true;
  };

  const destroyAutofocus = useAutofocus(autofocus);
  return () => {
    destroyNavigate();
    destroyAutofocus();
  };
};
