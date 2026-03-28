declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    getLevel(): number;
    getCenter(): LatLng;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class CustomOverlay {
    constructor(options: {
      map?: Map;
      position: LatLng;
      content: HTMLElement | string;
      yAnchor?: number;
    });
    setMap(map: Map | null): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: typeof kakao;
}
