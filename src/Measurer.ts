import L from "leaflet";

export class Measurer {
  #map: L.Map;
  #points: L.LatLng[] = [];
  #path: L.Polyline;
  #marker: L.Marker;
  #clearButton: HTMLButtonElement;
  #deleteButton: HTMLButtonElement;
  #dist = 0;

  #render() {
    this.#path.setLatLngs(this.#points);
    this.#marker.setLatLng(this.#points[this.#points.length - 1]);
    if (this.#dist > 10000) {
      this.#clearButton.textContent = `Measure: ${(this.#dist / 1000).toFixed(
        3
      )} km`;
    } else {
      this.#clearButton.textContent = `Measure: ${this.#dist.toFixed(2)} m`;
    }

    if (this.#points.length > 1) this.#deleteButton.style.display = "";
    else this.#deleteButton.style.display = "none";
  }

  constructor(
    map: L.Map,
    clearButton: HTMLButtonElement,
    deleteButton: HTMLButtonElement
  ) {
    this.#map = map;
    this.#path = L.polyline([], {
      color: "red",
      weight: 2,
      opacity: 0.5,
    }).addTo(map);
    this.#marker = L.marker([0, 0], {
      icon: L.divIcon({
        className: "current-position-marker",
        html: '<div style="background-color: red; width: 10px; height: 10px; border-radius: 50%;"></div>',
      }),
    }).addTo(map);
    this.#marker.setOpacity(0);
    this.#clearButton = clearButton;
    this.#deleteButton = deleteButton;

    this.#map.on("click", (e) => {
      this.#points.push(e.latlng);
      this.#marker.setOpacity(1);
      if (this.#points.length > 1) {
        this.#dist += this.#points[this.#points.length - 2].distanceTo(
          e.latlng
        );
      }
      this.#render();
    });

    clearButton.addEventListener("click", () => {
      this.#reset();
    });
    deleteButton.addEventListener("click", () => {
      const popped = this.#points.pop();
      if (popped) {
        this.#dist -= this.#points[this.#points.length - 1].distanceTo(popped);
      }
      this.#render();
    });
  }

  #reset() {
    this.#points.length = 0;
    this.#dist = 0;
    this.#path.setLatLngs([]);
    this.#marker.setOpacity(0);
    this.#clearButton.textContent = "Measure";
  }
}
