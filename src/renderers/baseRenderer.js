export class Renderer {
  root;

  constructor(root) {
    this.root = root;
  }

  _render(element, content) {
    this._show(element);
    element.innerHTML = content;
  }

  _show(element) {
    element.classList.remove("hidden");
  }

  _hide(element) {
    element.classList.add("hidden");
  }

  matchObjectIds(objectOrId, obj, prop) {
    if (typeof objectOrId === "string") {
      const el = document.getElementById(objectOrId);
      if (el === null) {
        throw new Error(`${objectOrId} not found`);
      }

      obj[prop] = el;
      return;
    }

    for (const prop in objectOrId) {
      this.matchObjectIds(objectOrId[prop], objectOrId, prop);
    }
  }

  renderLayout(template) {
    this.root.innerHTML = template;

    this.matchObjectIds(this.elements);
  }
}
