export function formatNum(n, shorten = false) {
  if (!shorten) {
    // Convert the number to a string
    let numStr = n.toString();

    // Split the number into the integer and decimal parts
    let [integerPart, decimalPart] = numStr.split(".");

    // Add thousand separators to the integer part
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "");

    // Combine the integer part and the decimal part if it exists
    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }

  if (n > 10000000000) {
    return `${(n / 1000000000).toFixed(0)}B`;
  }

  if (n > 10000000) {
    return `${(n / 1000000).toFixed(0)}M`;
  }

  if (n > 10000) {
    return `${(n / 1000).toFixed(0)}K`;
  }

  return n.toFixed(2);
}

export function checksum(s) {
  var chk = 0x12345678;
  var len = s.length;
  for (var i = 0; i < len; i++) {
    chk += s.charCodeAt(i) * (i + 1);
  }

  return chk & 0xff;
}

export function shuffle(array, r) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor((r / 256) * currentIndex);
    r = checksum(((r + 1) * (r + 1)).toString());
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
}

export function parseLine(line) {
  const [cmd, ..._values] = line.trim().split(" ");
  const values = _values.map((v) => (v.endsWith(",") ? v.slice(0, -1) : v));
  return [cmd, values];
}

export function clearQueryParams() {
  const url = new URL(window.location.href);
  url.search = "";

  // also update menu btn
  const menuBtn = document.getElementById("back-to-menu");
  if (menuBtn) {
    menuBtn.href = `/${url.search}#menu`;
  }

  window.history.pushState(null, "", url.toString());
}

export function route(route, params) {
  const url = new URL(window.location.href);
  const oldURL = window.location.href;
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }

  url.hash = `#${route}`;

  window.history.pushState(null, "", url.toString());

  window.dispatchEvent(
    new HashChangeEvent("hashchange", { oldURL, newURL: url })
  );
}

export function setQueryParams(params) {
  const url = new URL(window.location.href);
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }

  // also update menu btn
  const menuBtn = document.getElementById("back-to-menu");
  if (menuBtn) {
    menuBtn.href = `/${url.search}#menu`;
  }

  window.history.pushState(null, "", url.toString());
}

export const href = (hash) => `/${location.search}${hash}`;
export const useNavigate = (form) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const link = new FormData(form).get("nav");

    const a = Array.from(form.children).find((el) => {
      if (!el.href) return false;
      // TODO: on FF, it gets opened twice on keyboard action...
      if (el.target === "_blank") return el.href === link;
      return new URL(el.href).hash.slice(1) === link;
    });
    if (a) a.click();
  };
  form.addEventListener("submit", handleSubmit);
  return () => {
    form.removeEventListener("submit", handleSubmit);
  };
};

export const useAutofocus = (onIdleClick) => {
  const onClick = () => {
    setTimeout(() => {
      if (document.activeElement === document.body) {
        onIdleClick();
      }
    }, 100);
  };

  window.addEventListener("click", onClick);

  onIdleClick();

  return () => {
    window.removeEventListener("click", onClick);
  };
};

export const sortOptions = (options) => {
  const isNote = options.map((o) => o.option).includes("C#");
  const isAlphanumeric = options.some((o) => isNaN(parseInt(o.option)));
  const noteMap = [
    "C_",
    "C#",
    "D_",
    "D#",
    "E_",
    "F_",
    "F#",
    "G_",
    "G#",
    "A_",
    "A#",
    "B_",
  ];
  return options.sort((a, b) => {
    if (isNote)
      return noteMap.indexOf(a.option) < noteMap.indexOf(b.option) ? -1 : 1;
    if (isAlphanumeric) return a.option > b.option ? 1 : -1;

    return parseInt(a.option) > parseInt(b.option) ? 1 : -1;
  });
};

export const simplifyTrack = (track) => {
  const lines = track.split("\n");
  for (let i = 0; i < lines.length; ++i) {
    if (lines[i].includes('unused')) continue
    if (lines[i].includes("sound_loop") || lines[i].includes("sound_ret")) {
      lines[i] = "  channel_end";
      if (lines[i - 1] === "  channel_end") {
        lines.splice(i, 1);
      }
    }
  }
  return lines.join("\n");
};

export const _props = (el, { id, innerText, innerHTML } = {}) => {
  if (id) el.id = id;
  if (innerText) el.innerText = innerText;
  if (innerHTML) el.innerHTML = innerHTML;

  return el;
};
export const c = (elType, props) =>
  _props(document.createElement(elType), props);
export const e = (id, props) => _props(document.getElementById(id), props);
export const now = () => Math.floor(Date.now() / 1000);
export const getNoteLength = (tempo, noteLength) =>
  (1000 * 867 * tempo * noteLength) / 0x100000;
export const getSongLength = (tempo, seek) => getNoteLength(tempo, seek);
export const prepend = (n) => (n < 10 ? `0${n}` : n);

export const formatSeconds = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};
