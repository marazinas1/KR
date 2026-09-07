import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const COORDS: [number, number] = [22.248996, 55.983649];

/** Client-only monochrome Carto map with a sage ensō marker. */
export default function LocationMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let map: MapLibreMap | null = null;

    const init = () => {
      if (map) return;
      map = new MapLibreMap({
        container: node,
        center: COORDS,
        zoom: 15.5,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
                "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
                "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [{ id: "carto", type: "raster", source: "carto" }],
        },
      });

      map.scrollZoom.disable();
      map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

      const el = document.createElement("div");
      el.setAttribute("aria-label", "Dharma Stay – Birutės g. 1, Telšiai");
      el.style.width = "44px";
      el.style.height = "44px";
      el.innerHTML = `
        <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
          <circle cx="22" cy="22" r="16" fill="none" stroke="#5A6B5D" stroke-width="1"
            stroke-linecap="round" stroke-dasharray="88 12" transform="rotate(-35 22 22)" />
          <circle cx="22" cy="22" r="5" fill="#5A6B5D" />
        </svg>`;
      new Marker({ element: el }).setLngLat(COORDS).addTo(map);
    };

    if (typeof IntersectionObserver === "undefined") {
      init();
      return () => map?.remove();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          init();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      map?.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}