import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Measurer } from "./Measurer";
import { PathAnimator, type TrackPoint } from "./PathAnimator";
import "./style.css";

function* getPoints(trk: Element): Generator<TrackPoint> {
  for (const seg of trk.querySelectorAll("trkseg")) {
    for (const trkpt of seg.querySelectorAll("trkpt")) {
      yield {
        lat: Number(trkpt.getAttribute("lat")),
        lon: Number(trkpt.getAttribute("lon")),
      };
    }
  }
}

function init() {
  const container = document.getElementById("app");

  if (!container) throw new Error('There is no div with the id: "app" ');

  const map = L.map(container, {
    center: L.latLng(41.387241, 2.168963),
    zoom: 15,
  });

  map.setView([53.54, -113.5], 11.5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const measure = document.querySelector<HTMLButtonElement>("button#measure");
  const deletePrevious =
    document.querySelector<HTMLButtonElement>("button#delete-prev");
  if (!measure) throw new Error('There is no button with the id: "measure"');
  if (!deletePrevious)
    throw new Error('There is no button with the id: "delete-prev"');
  Measurer.mount(map, measure, deletePrevious);

  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  const clear = document.querySelector<HTMLButtonElement>("button#clear");

  const restart = document.querySelector<HTMLButtonElement>("button#restart");
  const recenter = document.querySelector<HTMLButtonElement>("button#recenter");

  clear?.addEventListener("click", () => {
    if (input) {
      input.value = "";
      input.files = null;
      getInput();
    }
  });

  async function getInput() {
    const item = input?.files?.item(0);
    if (!item) {
      if (input) input.style.display = "";
      if (clear) clear.style.display = "none";
      PathAnimator.reset();
      return;
    }

    if (input) input.style.display = "none";
    if (clear) clear.style.display = "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(await item.text(), "text/xml");

    // Get points from the first track
    const trk = doc.querySelector("trk");
    if (!trk) return;

    const points = Array.from(getPoints(trk));

    PathAnimator.start(map, points);
  }

  input?.addEventListener("input", getInput);
  getInput();

  restart?.addEventListener("click", () => PathAnimator.restart());
  recenter?.addEventListener("click", () => PathAnimator.recenter());
}

init();
