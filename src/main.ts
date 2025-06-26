import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { Measurer } from "./Measurer";

interface TrackPoint {
  lat: number;
  lon: number;
}

// Calculate perpendicular distance from point to line segment
function perpendicularDistance(
  point: TrackPoint,
  lineStart: TrackPoint,
  lineEnd: TrackPoint
): number {
  const x = point.lat;
  const y = point.lon;
  const x1 = lineStart.lat;
  const y1 = lineStart.lon;
  const x2 = lineEnd.lat;
  const y2 = lineEnd.lon;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

// Ramer-Douglas-Peucker algorithm implementation
function simplifyPoints(points: TrackPoint[], epsilon: number): TrackPoint[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > epsilon) {
    const firstLine = simplifyPoints(points.slice(0, index + 1), epsilon);
    const secondLine = simplifyPoints(points.slice(index), epsilon);
    return [...firstLine.slice(0, -1), ...secondLine];
  }

  return [points[0], points[points.length - 1]];
}

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

class PathAnimator {
  private map: L.Map;
  private path: L.Polyline;
  private marker: L.Marker;
  private points: TrackPoint[];
  private currentIndex: number = 0;
  private animationInterval: number | null = null;
  private readonly interval: number = 75; // milliseconds
  private readonly epsilon: number = 5e-5; // Adjust this value to control simplification level

  constructor(map: L.Map, points: TrackPoint[]) {
    this.map = map;
    // Simplify points using Ramer-Douglas-Peucker algorithm
    this.points = simplifyPoints(points, this.epsilon);
    console.log(
      `Simplified from ${points.length} to ${this.points.length} points`
    );

    // Create a polyline for the path
    this.path = L.polyline([], {
      color: "blue",
      weight: 2,
      opacity: 0.5,
    }).addTo(map);

    // Create a marker for the current position
    this.marker = L.marker([0, 0], {
      icon: L.divIcon({
        className: "current-position-marker",
        html: '<div style="background-color: red; width: 10px; height: 10px; border-radius: 50%;"></div>',
      }),
    }).addTo(map);

    this.recenter();
  }

  recenter() {
    // Fit map to bounds
    const bounds = L.latLngBounds(
      this.points.map((p) => L.latLng(p.lat, p.lon))
    );
    this.map.fitBounds(bounds, { padding: [50, 50] });
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
      this.path.setLatLngs(pathPoints.map((p) => [p.lat, p.lon]));

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

  const measure = document.querySelector<HTMLButtonElement>("button#measure");
  const deletePrevious =
    document.querySelector<HTMLButtonElement>("button#delete-prev");
  if (!measure) throw new Error('There is no button with the id: "measure"');
  if (!deletePrevious)
    throw new Error('There is no button with the id: "delete-prev"');
  Measurer.mount(map, measure, deletePrevious);

  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  const clear = document.querySelector<HTMLButtonElement>("button#clear");
  let currentAnimator: PathAnimator | null = null;

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
      currentAnimator?.reset();
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

    // Restart any existing animation
    currentAnimator?.reset();

    // Create new animator and start animation
    currentAnimator = new PathAnimator(map, points);
    currentAnimator.start();
  }

  input?.addEventListener("input", getInput);
  getInput();

  restart?.addEventListener("click", () => {
    currentAnimator?.reset();
    currentAnimator?.start();
  });
  recenter?.addEventListener("click", () => currentAnimator?.recenter());
}

init();
