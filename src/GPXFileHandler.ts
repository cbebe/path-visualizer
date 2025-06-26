export interface TrackPoint {
  lat: number;
  lon: number;
}

export class GPXFileHandler {
  #input: HTMLInputElement;
  #clear: HTMLButtonElement;

  constructor(input: HTMLInputElement, clear: HTMLButtonElement) {
    this.#input = input;
    this.#clear = clear;
  }

  handle(data: (points: TrackPoint[]) => void, reset: () => void) {
    this.#clear.addEventListener("click", () => {
      this.#input.value = "";
      this.#input.files = null;
      this.#getInput(data, reset);
    });

    this.#input.addEventListener("input", () => this.#getInput(data, reset));
    this.#getInput(data, reset);
  }

  async #getInput(data: (points: TrackPoint[]) => void, reset: () => void) {
    const item = this.#input.files?.item(0);
    if (!item) {
      this.#input.style.display = "";
      this.#clear.style.display = "none";
      reset();
      return;
    }

    this.#input.style.display = "none";
    this.#clear.style.display = "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(await item.text(), "text/xml");

    // Get points from the first track
    const trk = doc.querySelector("trk");
    if (!trk) return;

    data(Array.from(GPXFileHandler.#getPoints(trk)));
  }

  static *#getPoints(trk: Element): Generator<TrackPoint> {
    for (const seg of trk.querySelectorAll("trkseg")) {
      for (const trkpt of seg.querySelectorAll("trkpt")) {
        yield {
          lat: Number(trkpt.getAttribute("lat")),
          lon: Number(trkpt.getAttribute("lon")),
        };
      }
    }
  }
}
