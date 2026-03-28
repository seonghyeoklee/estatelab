declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
    getBounds(): LatLngBounds;
    panTo(latlng: LatLng): void;
    addControl(control: ZoomControl | MapTypeControl, position: ControlPosition): void;
    relayout(): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(latlng: LatLng): void;
    contain(latlng: LatLng): boolean;
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    isEmpty(): boolean;
  }

  class Marker {
    constructor(options: {
      map?: Map;
      position: LatLng;
      image?: MarkerImage;
      title?: string;
      clickable?: boolean;
      zIndex?: number;
      opacity?: number;
    });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setPosition(latlng: LatLng): void;
    setVisible(visible: boolean): void;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point });
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  class CustomOverlay {
    constructor(options: {
      map?: Map;
      position: LatLng;
      content: HTMLElement | string;
      clickable?: boolean;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setPosition(latlng: LatLng): void;
    setContent(content: HTMLElement | string): void;
  }

  class MarkerClusterer {
    constructor(options: {
      map: Map;
      markers?: Marker[];
      gridSize?: number;
      averageCenter?: boolean;
      minLevel?: number;
      minClusterSize?: number;
      disableClickZoom?: boolean;
      styles?: Array<{
        width?: string;
        height?: string;
        background?: string;
        borderRadius?: string;
        color?: string;
        textAlign?: string;
        fontWeight?: string;
        fontSize?: string;
        lineHeight?: string;
      }>;
      calculator?: number[];
    });
    addMarker(marker: Marker): void;
    addMarkers(markers: Marker[]): void;
    removeMarker(marker: Marker): void;
    removeMarkers(markers: Marker[]): void;
    clear(): void;
    redraw(): void;
  }

  class ZoomControl {
    constructor();
  }

  class MapTypeControl {
    constructor();
  }

  class Polygon {
    constructor(options: {
      map?: Map;
      path: LatLng[] | LatLng[][];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeStyle?: string;
      fillColor?: string;
      fillOpacity?: number;
    });
    setMap(map: Map | null): void;
    setOptions(options: { fillColor?: string; fillOpacity?: number; strokeColor?: string }): void;
  }

  enum ControlPosition {
    TOP = 1,
    TOPLEFT = 2,
    TOPRIGHT = 3,
    BOTTOMLEFT = 4,
    LEFT = 5,
    RIGHT = 7,
    BOTTOM = 8,
  }

  namespace event {
    function addListener(
      target: Map | Marker | MarkerClusterer | Polygon | CustomOverlay,
      type: string,
      handler: (e?: { latLng?: LatLng; point?: Point }) => void
    ): void;
    function removeListener(
      target: Map | Marker | MarkerClusterer | Polygon | CustomOverlay,
      type: string,
      handler: (...args: unknown[]) => void
    ): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: typeof kakao;
}
