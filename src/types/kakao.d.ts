declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level: number });
  }

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class CustomOverlay {
    constructor(options: {
      map: Map;
      position: LatLng;
      content: HTMLElement | string;
      yAnchor?: number;
    });
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: typeof kakao;
}
