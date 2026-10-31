/** Recognizable state monuments used on house-hunting location cards. */

export type LocationLandmark = {
  /** Primary monument labels shown on the card */
  monuments: string[];
  /** Hero / card image */
  imageUrl: string;
  /** Optional second image for dual-monument layouts (e.g. Lagos, Ogun) */
  imageUrlSecondary?: string;
};

const STATE_LANDMARKS: Record<string, LocationLandmark> = {
  lagos: {
    monuments: ["Lekki–Ikoyi Link Bridge", "National Theatre"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Lekki_Ikoyi_Link_Bridge.jpg/1280px-Lekki_Ikoyi_Link_Bridge.jpg",
    imageUrlSecondary:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/National_Theatre%2C_Iganmu_Lagos.jpg/1280px-National_Theatre%2C_Iganmu_Lagos.jpg",
  },
  abuja: {
    monuments: ["Aso Rock", "Abuja National Mosque"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Aso_Rock_Abuja.jpg/1280px-Aso_Rock_Abuja.jpg",
    imageUrlSecondary:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/AbujaNationalMosque.jpg/1280px-AbujaNationalMosque.jpg",
  },
  ogun: {
    monuments: ["Olumo Rock", "Abeokuta Interchange"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/New_Olumo_Rock%2C_Abeokuta.jpg/1280px-New_Olumo_Rock%2C_Abeokuta.jpg",
    imageUrlSecondary:
      "https://upload.wikimedia.org/wikipedia/commons/3/3a/Abeokuta_flyover_bridge%2C_Oke-ilowo2.jpg",
  },
  oyo: {
    monuments: ["Mapo Hall, Ibadan"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/MAPO_HALL%2C_Ibadan_2.jpg/1280px-MAPO_HALL%2C_Ibadan_2.jpg",
  },
  rivers: {
    monuments: ["Port Harcourt flyovers"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Flyover_bridge_construction%2C_Port_Harcourt_Nigeria_02.jpg/1280px-Flyover_bridge_construction%2C_Port_Harcourt_Nigeria_02.jpg",
  },
  kano: {
    monuments: ["Ancient Kano City Walls"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Kano-city-wall-banner.png/1280px-Kano-city-wall-banner.png",
  },
  enugu: {
    monuments: ["Enugu Coal City hills"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Enugu.jpg/1280px-Enugu.jpg",
  },
  edo: {
    monuments: ["Oba’s Palace, Benin City"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Royal_Palace_of_the_Oba_of_Benin.jpg/1280px-Royal_Palace_of_the_Oba_of_Benin.jpg",
  },
  delta: {
    monuments: ["River Niger Bridge, Asaba"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ed/River_Niger_bridge._Asaba%2C_Delta_state.jpg",
  },
  kaduna: {
    monuments: ["Arewa House"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Arewa_house_arechives_section.jpg/1280px-Arewa_house_arechives_section.jpg",
  },
  osun: {
    monuments: ["Osun-Osogbo Sacred Grove"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/Osun-Osogbo_Sacred_Grove.jpg",
  },
  ondo: {
    monuments: ["Idanre Hills"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Idanre_Hills.jpg",
  },
  "cross-river": {
    monuments: ["Agbokim Waterfalls"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Agbokim_Waterfalls.jpg/1280px-Agbokim_Waterfalls.jpg",
  },
  niger: {
    monuments: ["Zuma Rock"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Zuma_Rock.jpg",
  },
  plateau: {
    monuments: ["Jos Plateau"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Sunrise_over_Jos_Plateau_02.jpg/1280px-Sunrise_over_Jos_Plateau_02.jpg",
  },
  borno: {
    monuments: ["Shehu’s Palace, Maiduguri"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Shehu_Palace_Maiduguri.jpg/1280px-Shehu_Palace_Maiduguri.jpg",
  },
  kwara: {
    monuments: ["Ilorin Central Mosque"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Ilorin_Central_Mosque.jpg/1280px-Ilorin_Central_Mosque.jpg",
  },
  kogi: {
    monuments: ["Niger–Benue confluence, Lokoja"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/AFR_V3_D344_Confluence_of_the_Kwara_%28Niger%29_and_Benue.jpg/1280px-AFR_V3_D344_Confluence_of_the_Kwara_%28Niger%29_and_Benue.jpg",
  },
  imo: {
    monuments: ["Assumpta Cathedral, Owerri"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Assumpta_Cathedral_Owerri.jpg/1280px-Assumpta_Cathedral_Owerri.jpg",
  },
  anambra: {
    monuments: ["Ogbunike Caves"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/64/Ogbunike_cave%2C_Ogbunike.jpg",
  },
  abia: {
    monuments: ["National War Museum, Umuahia"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/National_War_Museum_Umuahia_06.jpg/1280px-National_War_Museum_Umuahia_06.jpg",
  },
  "akwa-ibom": {
    monuments: ["Ibeno Beach"],
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Ibeno_beach.jpg",
  },
  bayelsa: {
    monuments: ["Nigerian Content Tower, Yenagoa"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Nigerian_Content_Tower%2C_Yenagoa_Bayelsa_2.jpg/1280px-Nigerian_Content_Tower%2C_Yenagoa_Bayelsa_2.jpg",
  },
  sokoto: {
    monuments: ["Sultan Bello Mosque"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/A_landscape_view_of_The_Sultan_Bello%27s_mosque_02.jpg/1280px-A_landscape_view_of_The_Sultan_Bello%27s_mosque_02.jpg",
  },
  katsina: {
    monuments: ["Gobarau Minaret"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Gobarau_Minaret.jpg/1280px-Gobarau_Minaret.jpg",
  },
  kebbi: {
    monuments: ["Argungu Fishing Festival"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Argungu_Fishing_Festival.jpg/1280px-Argungu_Fishing_Festival.jpg",
  },
  zamfara: {
    monuments: ["Gusau roundabout"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Roundabout_in_Gusau.jpg/1280px-Roundabout_in_Gusau.jpg",
  },
  yobe: {
    monuments: ["Hadejia-Nguru wetlands"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/A_wetland_landscape%28Hadejia-Jama%27are_Ramsar_site%29.jpg/1280px-A_wetland_landscape%28Hadejia-Jama%27are_Ramsar_site%29.jpg",
  },
  taraba: {
    monuments: ["Mambilla Plateau"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Mambilla_Plateau.jpg/1280px-Mambilla_Plateau.jpg",
  },
  gombe: {
    monuments: ["Gombe cityscape"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Gombe_2.jpg/1280px-Gombe_2.jpg",
  },
  bauchi: {
    monuments: ["Yankari National Park"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/cd/A_Tree_Plants_in_Yankari.jpg",
  },
  jigawa: {
    monuments: ["Dutse Rock"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1a/Dutse_Rock_Range.jpg",
  },
  nasarawa: {
    monuments: ["Farin Ruwa Falls"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Farin_Ruwa_Falls.jpg/1280px-Farin_Ruwa_Falls.jpg",
  },
  ekiti: {
    monuments: ["Ikogosi Warm Springs"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4a/Ikogosi_warm_spring_05.jpg",
  },
  ebonyi: {
    monuments: ["Azugwu Hill, Abakaliki"],
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0f/Abakaliki_metropolis_with_Azugwu_Hill_in_background_03.jpg",
  },
  adamawa: {
    monuments: ["Sukur Cultural Landscape"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Sukur_Cultural_Landscape_%283%29.jpg/1280px-Sukur_Cultural_Landscape_%283%29.jpg",
  },
  benue: {
    monuments: ["River Benue Bridge, Makurdi"],
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/River_Benue_%28in_Makurdi_showing_NEW_Bridge%29.jpg/1280px-River_Benue_%28in_Makurdi_showing_NEW_Bridge%29.jpg",
  },
};

/** City/area pages inherit or override parent-state landmarks */
const CITY_LANDMARKS: Record<string, LocationLandmark> = {
  lekki: {
    monuments: ["Lekki–Ikoyi Link Bridge"],
    imageUrl: STATE_LANDMARKS.lagos.imageUrl,
  },
  ikeja: {
    monuments: ["National Theatre, Lagos"],
    imageUrl: STATE_LANDMARKS.lagos.imageUrlSecondary!,
  },
  "victoria-island": {
    monuments: ["Lekki–Ikoyi Link Bridge"],
    imageUrl: STATE_LANDMARKS.lagos.imageUrl,
  },
  yaba: STATE_LANDMARKS.lagos,
  surulere: STATE_LANDMARKS.lagos,
  ajah: {
    monuments: ["Lekki–Ikoyi Link Bridge"],
    imageUrl: STATE_LANDMARKS.lagos.imageUrl,
  },
  ikorodu: STATE_LANDMARKS.lagos,
  gwarinpa: STATE_LANDMARKS.abuja,
  wuse: {
    monuments: ["Abuja National Mosque"],
    imageUrl: STATE_LANDMARKS.abuja.imageUrlSecondary!,
  },
  maitama: STATE_LANDMARKS.abuja,
  kubwa: STATE_LANDMARKS.abuja,
  ibadan: STATE_LANDMARKS.oyo,
  abeokuta: STATE_LANDMARKS.ogun,
  "port-harcourt": STATE_LANDMARKS.rivers,
  "benin-city": STATE_LANDMARKS.edo,
};

const FALLBACK: LocationLandmark = {
  monuments: ["Nigeria"],
  imageUrl: STATE_LANDMARKS.abuja.imageUrl,
};

export function getLandmarkForSlug(slug: string): LocationLandmark {
  return CITY_LANDMARKS[slug] || STATE_LANDMARKS[slug] || FALLBACK;
}
