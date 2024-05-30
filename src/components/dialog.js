export default ({
  action,
  content,
  cancelLabel,
  id,
}) => `<dialog class="nes-dialog width-md padding-md" id="dialog__${id}">
  <form method="dialog" id="dialog__${id}_form">
    ${typeof content === "function" ? content(`dialog__${id}`) : content}
    <menu class="dialog-menu inline ${
      action ? "justify-center" : "justify-start"
    } padding-sm gap-md align-center">
      <button class="nes-btn">${cancelLabel || "back"}</button>
      ${
        action
          ? `
          <button
            ${action.isForm ? "" : 'type="button"'}
            id="dialog__${id}_${action.id}"
            class="nes-btn is-primary"
          >${action.label}</button>`
          : ""
      }
    </menu>
  </form>
</dialog>
`;
