import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GPXFileHandler } from "./GPXFileHandler";
import { Measurer } from "./Measurer";
import { PathAnimator } from "./PathAnimator";
import "./style.css";

function element<T extends Element = HTMLElement>(selector: string): T {
  const e = document.querySelector<T>(selector);
  if (!e) throw new Error(`No element with the selector: ${selector}`);
  return e;
}

function button(id: string): HTMLButtonElement {
  return element<HTMLButtonElement>(`button#${id}`);
}

function setupMap(container: HTMLDivElement): L.Map {
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
  return map;
}

function init() {
  const map = setupMap(element<HTMLDivElement>("div#app"));
  new Measurer(map, button("measure"), button("delete-prev"));
  const a = new PathAnimator(map, button("restart"), button("recenter"));
  const h = new GPXFileHandler(element("input[type=file]"), button("clear"));
  h.handle(a.start.bind(a), a.reset.bind(a));
}

init();
