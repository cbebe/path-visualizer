import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

interface TrackPoint {
  lat: number;
  lon: number;
}

function* getPoints(trk: Element): Generator<TrackPoint> {
  for (const seg of trk.querySelectorAll("trkseg")) {
    for (const trkpt of seg.querySelectorAll("trkpt")) {
      yield {
        lat: Number(trkpt.getAttribute('lat')),
        lon: Number(trkpt.getAttribute('lon'))
      };
    }
  }
}

class PathAnimator {
  private map: L.Map;
  private path: L.Polyline;
  private marker: L.Marker;
  private points: TrackPoint[];
  private currentIndex: number = 0;
  private animationInterval: number | null = null;
  private readonly interval: number = 75; // milliseconds

  constructor(map: L.Map, points: TrackPoint[]) {
    this.map = map;
    this.points = points;
    
    // Create a polyline for the path
    this.path = L.polyline([], {
      color: 'blue',
      weight: 2,
      opacity: 0.5
    }).addTo(map);

    // Create a marker for the current position
    this.marker = L.marker([0, 0], {
      icon: L.divIcon({
        className: 'current-position-marker',
        html: '<div style="background-color: red; width: 10px; height: 10px; border-radius: 50%;"></div>'
      })
    }).addTo(map);

    // Fit map to bounds
    const bounds = L.latLngBounds(points.map(p => L.latLng(p.lat, p.lon)));
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  start() {
    if (this.animationInterval) return;
    
    this.animationInterval = window.setInterval(() => {
      if (this.currentIndex >= this.points.length) {
        this.stop();
        return;
      }

      const currentPoint = this.points[this.currentIndex];
      const pathPoints = this.points.slice(0, this.currentIndex + 1);

      // Update marker position
      this.marker.setLatLng([currentPoint.lat, currentPoint.lon]);

      // Update path
      this.path.setLatLngs(pathPoints.map(p => [p.lat, p.lon]));

      this.currentIndex++;
    }, this.interval);
  }

  stop() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  reset() {
    this.stop();
    this.currentIndex = 0;
    this.marker.setLatLng([0, 0]);
    this.path.setLatLngs([]);
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
  let currentAnimator: PathAnimator | null = null;

  async function getInput() {
    const item = input?.files?.item(0);
    if (!item) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(await item.text(), "text/xml");
    
    // Get points from the first track
    const trk = doc.querySelector("trk");
    if (!trk) return;

    const points = Array.from(getPoints(trk));

    // Stop any existing animation
    if (currentAnimator) {
      currentAnimator.stop();
    }

    // Create new animator and start animation
    currentAnimator = new PathAnimator(map, points);
    currentAnimator.start();
  }

  input?.addEventListener("input", getInput);
  getInput();
}

init();
