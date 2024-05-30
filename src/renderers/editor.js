import { Parser } from "../modules/parser";
import { Composer } from "../modules/composer";
import { getSetting } from "../modules/settings";
import { sortOptions } from "../utils";
import SwiperSelect from "./swiper-select";
import "./editor.css";

const keyboardTemplate = (id, options) => `
<div class="keyboard">${options
  .map(
    ({ option, index }) =>
      `<span id="editor__keyboard_${id}_key_${index}" class="text sm align-center padding-md-stretch border">${option}</span>`
  )
  .join("")}</div>`;

const commandContentTemplate = (id, command, index, channelIndex) =>
  `<span id="editor__${id}_${channelIndex}_${index}_cmd" class="padding-sm-squish">${
    command.cmd
  }</span>${command.values
    .map(
      (v, i) =>
        `<span class="padding-sm-squish" id="editor__${id}_${channelIndex}_${index}_${i}">${v}${
          i === command.values.length - 1 ? "" : ","
        }</span>`
    )
    .join("")}`;

export const commandTemplate = (id, command, index, channelIndex, classes) =>
  `<div id="editor__${id}_${channelIndex}_${index}" class="inline wrap editor-command${
    classes ? ` ${classes.join(" ")}` : ""
  }">${commandContentTemplate(id, command, index, channelIndex)}</div>`;

export const friendlyTemplate = (id, name, track) =>
  `<div id="editor__${id}" class="nes-balloon text sm padding-md editor stack bg-secondary gap-lg">
    ${track
      .map(
        (channel, channelIndex) =>
          `<div class="stack"><span>channel${
            channelIndex + 1
          }::</span>${channel
            .map((command, lineIndex) =>
              commandTemplate(id, command, lineIndex, channelIndex)
            )
            .join("")}</div>`
      )
      .join("")}
    </div>
<div id="editor__keyboard_${id}" class="hidden"></div>
`;

export const desktopTemplate = (id, name, track) =>
  `<textarea name="${name}" class="editor nes-textarea" id="editor_textarea_${id}">${track}</textarea>`;

export class Editor {
  editorView;
  seek;
  parser;
  id;
  root;
  name;
  onChange;
  latestTarget;
  tempComposer;
  destroyLayout;
  destroyKeyboard;
  destroySwiper;

  getTarget() {
    const [_channelIndex, _lineIndex, _valueIndex] = this.latestTarget.id
      .slice(`editor__${this.id}_`.length)
      .split("_");

    const channelIndex = parseInt(_channelIndex);
    const lineIndex = parseInt(_lineIndex);
    const valueIndex = parseInt(_valueIndex);

    return {
      channelIndex,
      lineIndex,
      value: isNaN(valueIndex) ? _valueIndex : valueIndex,
    };
  }

  constructor({ composition, id, root, name, onChange }) {
    this.onChange = onChange;
    this.root = root;
    this.addListeners();
    this.id = id;
    this.name = name;

    this.parser = new Parser();
    if (composition) this.parser.parse(composition);
    this.updateEditorView();
  }

  renderLayout() {
    switch (this.editorView) {
      case "text":
        return this.renderText();
      case "friendly":
      case "friendly-desktop":
        return this.renderFriendlyLayout();
    }
  }

  getKeyboardOptions = () => {
    const composer = this.getComposer();
    return sortOptions(
      composer.getNextOptions().map((o, i) => ({ option: o.option, index: i }))
    );
  };

  activateSwiper(keyboard) {
    if (this.destroySwiper) this.destroySwiper();
    const options = this.getKeyboardOptions();
    this.destroySwiper = SwiperSelect(keyboard, {
      currentIndex: options.findIndex(
        (o) => o.option == this.latestTarget.innerText.split(",")[0]
      ),
      options,
      direction: options.find((o) => o.option === "tempo") ? "Y" : "X",
      onSelect: this.applyOption.bind(this),
    });
  }

  activateKeyboard(keyboard) {
    if (this.destroyKeyboard) this.destroyKeyboard();

    keyboard.innerHTML = keyboardTemplate(this.id, this.getKeyboardOptions());
    const handleKeyClick = (e) => {
      this.applyOption(
        parseInt(e.target.id.slice(`editor__keyboard_${this.id}_key_`.length))
      );
    };
    keyboard.addEventListener("click", handleKeyClick);
    this.destroyKeyboard = () => {
      keyboard.removeEventListener("click", handleKeyClick);
    };
  }

  getComposer(forceRenew = false) {
    if (!forceRenew && this.tempComposer) return this.tempComposer;

    const tempComposer = new Composer();
    const { channelIndex, lineIndex, value } = this.getTarget();
    tempComposer.track = [
      this.parser.composer.track[channelIndex].slice(0, lineIndex),
    ];
    if (value !== "cmd") {
      const command = this.parser.composer.track[channelIndex][lineIndex];
      tempComposer.currentCommand = {
        cmd: command.cmd,
        values: command.values.slice(0, value),
      };
    }

    this.tempComposer = tempComposer;

    return tempComposer;
  }

  commandStillHasOptions = () => {
    const options = this.getComposer()
      .getNextOptions()
      .map((o) => o.option);
    return options.includes("tempo") ? null : options;
  };

  getDisplayOption = (option) =>
    this.commandStillHasOptions() ? `${option},` : option;

  purgeLine() {
    const element = this.latestTarget.parentElement;
    const { channelIndex, lineIndex } = this.getTarget();
    this.parser.composer.track[channelIndex][lineIndex].values = [];
    while (element.children.length > 1)
      element.removeChild(element.children[1]);
  }

  getId = (i, lineI, chI) => {
    const { channelIndex, lineIndex } = this.getTarget();
    return `editor__${this.id}_${chI || channelIndex}_${
      lineI === undefined ? lineIndex : lineI
    }_${i}`;
  };

  insertOption() {
    const { channelIndex, lineIndex } = this.getTarget();
    const parent = this.latestTarget.parentElement;
    const i = parent.children.length - 1;
    const composer = this.getComposer();
    const { option } = composer.getNextOptions()[0];
    composer.applyOption(0);
    this.parser.composer.track[channelIndex][lineIndex].values[i] = option;

    const newEl = document.createElement("span");
    newEl.id = this.getId(i);
    newEl.innerText = this.getDisplayOption(option);
    newEl.classList.add("padding-sm-squish");
    parent.appendChild(newEl);
    return newEl;
  }

  deleteRow() {}

  insertRow() {
    const command = {
      cmd: "sound_ret",
      values: [],
    };
    const { channelIndex, lineIndex } = this.getTarget();
    this.parser.composer.track[channelIndex][lineIndex + 1] = command;
    const parent = this.latestTarget.parentElement.parentElement;
    const container = document.createElement("div");
    container.classList.add("inline", "wrap", "editor-command");
    container.innerHTML = commandContentTemplate(
      this.id,
      command,
      lineIndex + 1,
      channelIndex
    );
    parent.appendChild(container);
    return document.getElementById(this.getId("cmd", lineIndex + 1));
  }

  // where all the magic happens...
  applyOption(optionIndex) {
    const composer = this.getComposer();
    const selectedOption = composer.getNextOptions()[optionIndex].option;
    const { channelIndex, lineIndex, value } = this.getTarget();
    const progress = (target) => {
      this.initializeKeyboard({ target });
      this.onChange(this.parser.composer.renderTrack());
    };

    let hasAdvanced = false;
    if (value === "cmd") {
      if (
        selectedOption !==
        this.parser.composer.track[channelIndex][lineIndex].cmd
      ) {
        this.purgeLine();
        this.parser.composer.track[channelIndex][lineIndex].cmd =
          selectedOption === "new_loop" ? ".mainloop:" : selectedOption;
        this.latestTarget.innerText = selectedOption;
        // apply change
        // ouch, we also need to apply this in the "other" compomser
        // TODO: adding/removing loops will be pretty complicated..
        composer.applyOption(optionIndex);
        let first;
        while (this.commandStillHasOptions()) {
          if (!first) first = this.insertOption();
          else this.insertOption();
        }
        if (first) return progress(first);
      } else {
        composer.applyOption(optionIndex);
        if (this.commandStillHasOptions())
          return progress(document.getElementById(this.getId(0)));
      }
    } else {
      // apply change
      composer.applyOption(optionIndex);
      this.parser.composer.track[channelIndex][lineIndex].values[
        value
      ] = selectedOption;
      this.latestTarget.innerText = this.getDisplayOption(selectedOption);
      if (this.commandStillHasOptions())
        return progress(document.getElementById(this.getId(value + 1)));
    }

    if (this.parser.composer.track[channelIndex].length > lineIndex + 1) {
      return progress(
        document.getElementById(this.getId("cmd", lineIndex + 1))
      );
    }
    if (channelIndex === composer.currentChannelIndex) {
      // need to add new row, we'll simply add a sound_ret by default
      return progress(this.insertRow());
    }
    if (this.parser.composer.track.length > channelIndex + 1) {
      return progress(
        document.getElementById(this.getId("cmd", 0, channelIndex + 1))
      );
    }

    // need to check if composer is finished, if not we need to open new channel
  }

  activateTarget() {
    this.latestTarget.classList.add("blink");
    this.latestTarget.parentElement.classList.add("editor-row-active");
  }

  deactivateTarget() {
    this.latestTarget.classList.remove("blink");
    this.latestTarget.parentElement.classList.remove("editor-row-active");
  }

  initializeKeyboard = ({ target }) => {
    const keyboard = document.getElementById(`editor__keyboard_${this.id}`);
    if (this.latestTarget) this.deactivateTarget();

    if (!target.id || target.id === `editor__${this.id}`) {
      keyboard.classList.add("hidden");
      return;
    }

    this.latestTarget = target;
    this.activateTarget();

    keyboard.classList.remove("hidden");
    this.getComposer(true);
    //const options = this.tempComposer.getNextOptions();
    if (this.editorView === "friendly") {
      this.activateSwiper(keyboard);
    } else {
      this.activateKeyboard(keyboard);
    }
  };

  renderFriendlyLayout() {
    this.root.innerHTML = friendlyTemplate(
      this.id,
      this.name,
      this.parser.composer.track
    );

    const editor = document.getElementById(`editor__${this.id}`);

    editor.addEventListener("click", this.initializeKeyboard);

    return () => {
      editor.removeEventListener("click", this.initializeKeyboard);
    };
  }

  renderText() {
    this.root.innerHTML = desktopTemplate(
      this.id,
      this.name,
      this.parser.composer.renderTrack()
    );
    const textarea = document.getElementById(`editor_textarea_${this.id}`);

    const onPaste = (e) => {
      e.preventDefault();
      handleKeyUp(e);
    };
    const handleKeyUp = (e) => {
      try {
        let isPaste = e.type === "paste";
        const data = isPaste ? e.clipboardData.getData("text") : textarea.value;
        this.parser.parse(data);
        if (isPaste) textarea.value = this.parser.composer.renderTrack();

        this.onChange(textarea.value);
      } catch (err) {
        this.onChange(err);
      }
    };

    textarea.addEventListener("keyup", handleKeyUp);
    // textarea.addEventListener("paste", onPaste);

    return () => {
      textarea.removeEventListener("keyup", handleKeyUp);
      // textarea.removeEventListener("paste", onPaste);
    };
  }

  addListeners() {
    window.addEventListener("resize", this.updateEditorView);
  }

  updateEditorView = () => {
    this.editorView = 'text'
      this.destroyLayout = this.renderLayout();
    return
    const editorSetting = getSetting("composerUI");
    const isLargeScreen = window.innerWidth > 768;
    let newView = isLargeScreen ? "text" : "friendly";
    if (editorSetting !== "auto") {
      newView = editorSetting
        ? isLargeScreen
          ? "friendly-desktop"
          : "friendly"
        : "text";
    }

    if (newView !== this.editorView) {
      this.editorView = newView;
      if (this.destroyLayout) this.destroyLayout();
      if (this.destroyKeyboard) this.destroyKeyboard();
      if (this.destroySwiper) this.destroySwiper();
      this.destroyLayout = this.renderLayout();
    }
  };

  destroy() {
    if (this.destroyLayout) this.destroyLayout();
    if (this.destroyKeyboard) this.destroyKeyboard();
    if (this.destroySwiper) this.destroySwiper();
    window.removeEventListener("resize", this.updateEditorView);
  }
}

export default (props) => {
  const editor = new Editor(props);

  return editor.destroy.bind(editor);
};
