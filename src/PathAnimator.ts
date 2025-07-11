import L from "leaflet";
import type { TrackPoint } from "./GPXFileHandler";

export class PathAnimator {
  #map: L.Map;
  #animation: PathAnimation | null = null;

  constructor(
    map: L.Map,
    restart: HTMLButtonElement,
    recenter: HTMLButtonElement
  ) {
    this.#map = map;
    restart.addEventListener("click", () => {
      this.#animation?.reset();
      this.#animation?.start();
    });
    recenter.addEventListener("click", () => this.#animation?.recenter());
  }

  reset() {
    this.#animation?.reset();
  }

  start(points: TrackPoint[]) {
    // Restart any existing animation
    this.#animation?.reset();
    // Create new animator and start animation
    this.#animation = new PathAnimation(this.#map, points);
    this.#animation.start();
  }
}

class PathAnimation {
  #map: L.Map;
  #path: L.Polyline;
  #marker: L.Marker;
  #points: TrackPoint[];
  #currentIndex: number = 0;
  #animationInterval: number | null = null;
  readonly #interval: number = 75; // milliseconds
  readonly #epsilon: number = 5e-5; // Adjust this value to control simplification level

  constructor(map: L.Map, points: TrackPoint[]) {
    this.#map = map;
    // Simplify points using Ramer-Douglas-Peucker algorithm
    this.#points = PathAnimation.#simplifyPoints(points, this.#epsilon);
    console.log(
      `Simplified from ${points.length} to ${this.#points.length} points`
    );

    // Create a polyline for the path
    this.#path = L.polyline([], {
      color: "blue",
      weight: 2,
      opacity: 0.5,
    }).addTo(map);

    // Create a marker for the current position
    this.#marker = L.marker([0, 0], {
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
      this.#points.map((p) => L.latLng(p.lat, p.lon))
    );
    this.#map.fitBounds(bounds, { padding: [50, 50] });
  }

  start() {
    if (this.#animationInterval) return;

    this.#animationInterval = window.setInterval(() => {
      if (this.#currentIndex >= this.#points.length) {
        this.stop();
        return;
      }

      const currentPoint = this.#points[this.#currentIndex];
      const pathPoints = this.#points.slice(0, this.#currentIndex + 1);

      // Update marker position
      this.#marker.setLatLng([currentPoint.lat, currentPoint.lon]);

      // Update path
      this.#path.setLatLngs(pathPoints.map((p) => [p.lat, p.lon]));

      this.#currentIndex++;
    }, this.#interval);
  }

  stop() {
    if (this.#animationInterval) {
      clearInterval(this.#animationInterval);
      this.#animationInterval = null;
    }
  }

  reset() {
    this.stop();
    this.#currentIndex = 0;
    this.#marker.setLatLng([0, 0]);
    this.#path.setLatLngs([]);
  }

  // Calculate perpendicular distance from point to line segment
  static #perpendicularDistance(
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
  static #simplifyPoints(points: TrackPoint[], epsilon: number): TrackPoint[] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.#perpendicularDistance(
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
      const firstLine = this.#simplifyPoints(
        points.slice(0, index + 1),
        epsilon
      );
      const secondLine = this.#simplifyPoints(points.slice(index), epsilon);
      return [...firstLine.slice(0, -1), ...secondLine];
    }

    return [points[0], points[points.length - 1]];
  }
}
