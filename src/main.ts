import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

function *getPoints(trk: Element): Generator<[number, number]> {
    for (const seg of trk.querySelectorAll("trkseg")) {
      for (const trkpt of seg.querySelectorAll("trkpt")) {
        yield [Number(trkpt.getAttribute('lat')), Number(trkpt.getAttribute('lon'))]
      }
    }
}

function getTracks(doc: Document) {
  for (const trk of doc.querySelectorAll("trk")) {
    const title = trk.querySelector("name")?.textContent;
    const points = Array.from(getPoints(trk))
    const lats = points.map(([x]) => x);
    const lons = points.map(([_,x]) => x);
    const [maxLat, minLat] = [Math.max(...lats),Math.min(...lats)];
    const [maxLon, minLon] = [Math.max(...lons),Math.min(...lons)];
    console.log(title, points, maxLat, minLat, maxLon, minLon);
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

  const input = document.querySelector<HTMLInputElement>("input[type=file]");

  async function getInput() {
    const item = input?.files?.item(0);
    if (!item) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(await item.text(), "text/xml");
    console.log(getTracks(doc));
  }

  input?.addEventListener("input", getInput);
  getInput();
}

init();
