/**
 * Printer database seed.
 *
 * Bambu Lab is seeded in full because the compatibility features are built
 * against it. Prusa and Creality are seeded with one family each — not because
 * NordPrint sells them yet, but to prove the point that the hierarchy is data:
 * adding a manufacturer never requires a code change.
 *
 * Specifications are the publicly documented headline figures a shop assistant
 * would quote. They exist here to drive compatibility logic, not to reproduce
 * anyone's documentation.
 */

export interface SeedPrinterModel {
  name: string;
  handle: string;
  releaseYear: number;
  enclosed: boolean;
  maxNozzleTemperature: number;
  maxBedTemperature: number;
  buildVolume: [number, number, number];
  defaultNozzleDiameterMm: number;
  supportsAms: boolean;
  supportsAmsLite: boolean;
  hardenedNozzleStock: boolean;
  rank: number;
}

export interface SeedPrinterFamily {
  name: string;
  handle: string;
  description: string;
  rank: number;
  models: SeedPrinterModel[];
}

export interface SeedPrinterBrand {
  name: string;
  handle: string;
  websiteUrl: string;
  rank: number;
  families: SeedPrinterFamily[];
}

const fdm = {
  defaultNozzleDiameterMm: 0.4,
} as const;

export const SEED_PRINTER_BRANDS: SeedPrinterBrand[] = [
  {
    name: "Bambu Lab",
    handle: "bambu-lab",
    websiteUrl: "https://bambulab.com",
    rank: 1,
    families: [
      {
        name: "A1",
        handle: "bambu-a1",
        description: "Åbne bedslinger-printere med AMS Lite. Nemme at komme i gang med.",
        rank: 1,
        models: [
          {
            name: "A1",
            handle: "bambu-lab-a1",
            releaseYear: 2024,
            enclosed: false,
            maxNozzleTemperature: 300,
            maxBedTemperature: 100,
            buildVolume: [256, 256, 256],
            supportsAms: false,
            supportsAmsLite: true,
            hardenedNozzleStock: false,
            rank: 1,
            ...fdm,
          },
          {
            name: "A1 Mini",
            handle: "bambu-lab-a1-mini",
            releaseYear: 2023,
            enclosed: false,
            maxNozzleTemperature: 300,
            maxBedTemperature: 80,
            buildVolume: [180, 180, 180],
            supportsAms: false,
            supportsAmsLite: true,
            hardenedNozzleStock: false,
            rank: 2,
            ...fdm,
          },
        ],
      },
      {
        name: "P1",
        handle: "bambu-p1",
        description: "CoreXY med høj hastighed. P1S er lukket, P1P er åben.",
        rank: 2,
        models: [
          {
            name: "P1P",
            handle: "bambu-lab-p1p",
            releaseYear: 2022,
            enclosed: false,
            maxNozzleTemperature: 300,
            maxBedTemperature: 100,
            buildVolume: [256, 256, 256],
            supportsAms: true,
            supportsAmsLite: false,
            hardenedNozzleStock: false,
            rank: 1,
            ...fdm,
          },
          {
            name: "P1S",
            handle: "bambu-lab-p1s",
            releaseYear: 2023,
            enclosed: true,
            maxNozzleTemperature: 300,
            maxBedTemperature: 100,
            buildVolume: [256, 256, 256],
            supportsAms: true,
            supportsAmsLite: false,
            hardenedNozzleStock: true,
            rank: 2,
            ...fdm,
          },
        ],
      },
      {
        name: "X1",
        handle: "bambu-x1",
        description: "Flagskibet med lidar og lukket kabinet — bygget til tekniske materialer.",
        rank: 3,
        models: [
          {
            name: "X1",
            handle: "bambu-lab-x1",
            releaseYear: 2022,
            enclosed: true,
            maxNozzleTemperature: 300,
            maxBedTemperature: 110,
            buildVolume: [256, 256, 256],
            supportsAms: true,
            supportsAmsLite: false,
            hardenedNozzleStock: true,
            rank: 1,
            ...fdm,
          },
          {
            name: "X1 Carbon",
            handle: "bambu-lab-x1-carbon",
            releaseYear: 2022,
            enclosed: true,
            maxNozzleTemperature: 300,
            maxBedTemperature: 110,
            buildVolume: [256, 256, 256],
            supportsAms: true,
            supportsAmsLite: false,
            hardenedNozzleStock: true,
            rank: 2,
            ...fdm,
          },
        ],
      },
    ],
  },

  // Seeded to demonstrate that the hierarchy handles any manufacturer.
  {
    name: "Prusa Research",
    handle: "prusa",
    websiteUrl: "https://www.prusa3d.com",
    rank: 2,
    families: [
      {
        name: "MK4",
        handle: "prusa-mk4",
        description: "Bedslinger med input shaping og automatisk førstelagskalibrering.",
        rank: 1,
        models: [
          {
            name: "MK4S",
            handle: "prusa-mk4s",
            releaseYear: 2024,
            enclosed: false,
            maxNozzleTemperature: 290,
            maxBedTemperature: 120,
            buildVolume: [250, 210, 220],
            supportsAms: false,
            supportsAmsLite: false,
            hardenedNozzleStock: false,
            rank: 1,
            ...fdm,
          },
        ],
      },
    ],
  },
  {
    name: "Creality",
    handle: "creality",
    websiteUrl: "https://www.creality.com",
    rank: 3,
    families: [
      {
        name: "K1",
        handle: "creality-k1",
        description: "Lukket CoreXY til høje hastigheder.",
        rank: 1,
        models: [
          {
            name: "K1C",
            handle: "creality-k1c",
            releaseYear: 2024,
            enclosed: true,
            maxNozzleTemperature: 300,
            maxBedTemperature: 100,
            buildVolume: [220, 220, 250],
            supportsAms: false,
            supportsAmsLite: false,
            hardenedNozzleStock: true,
            rank: 1,
            ...fdm,
          },
        ],
      },
    ],
  },
];
