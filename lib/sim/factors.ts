// Every constant the app uses that is not typed in by the user.
//
// Rules (see docs/SOURCES.md):
//  - "cited": the value was read on the live source on the access date below.
//  - "calculated": arithmetic on cited values; the formula is given.
//  - "estimate": an assumption. The app labels it "estimate" and lets the user change it.

import { EmissionFactors } from "./types";

export const ACCESSED = "2026-11-15";

export interface SourceRef {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** Table, section or edition detail. */
  detail: string;
  licence: string;
}

export const SOURCES = {
  nirA6: {
    id: "nirA6",
    title: "National Inventory Report 1990–2024: Greenhouse Gas Sources and Sinks in Canada (2026 edition), Annex 6, Emission Factors",
    publisher: "Environment and Climate Change Canada",
    url: "https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/D-Emission-Factors/?lang=en",
    detail:
      "Table A6.1-1, CO2 Emission Factors for Marketable Natural Gas (2024 row); Table A6.1-4, CH4 and N2O Emission Factors for Natural Gas (row: Residential, Construction, Commercial/Institutional, Agriculture)",
    licence: "Open Government Licence – Canada",
  },
  nirA7: {
    id: "nirA7",
    title: "National Inventory Report 1990–2024 (2026 edition), Annex 7, Electricity in Canada: Summary and Intensity Tables",
    publisher: "Environment and Climate Change Canada",
    url: "https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/C-Tables-Electricity-Canada-Provinces-Territories/?lang=en",
    detail:
      "Tables A7-6 (Quebec), A7-7 (Ontario), A7-10 (Alberta), A7-11 (British Columbia): Consumption Intensity (g CO2 eq / kWh), 2024, marked preliminary",
    licence: "Open Government Licence – Canada",
  },
  ecccFactors: {
    id: "ecccFactors",
    title: "Emission factors and reference values, version 4.0 (September 2026)",
    publisher: "Environment and Climate Change Canada",
    url: "https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html",
    detail:
      "Table 1.4 (natural gas CO2), Table 2.4 (natural gas CH4 and N2O), Table 5.4 (electricity consumption intensities), Table 8 (higher heating values). Reproduces the NIR 1990–2024 values.",
    licence: "Government of Canada terms; reproduced with credit",
  },
  ecccGwp: {
    id: "ecccGwp",
    title: "Global warming potentials",
    publisher: "Environment and Climate Change Canada",
    url: "https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html",
    detail: "100-year global warming potentials from the IPCC Fifth Assessment Report: CH4 = 28, N2O = 265",
    licence: "Government of Canada terms; reproduced with credit",
  },
  keepingHeatIn: {
    id: "keepingHeatIn",
    title: "Keeping the Heat In, section 9.1.2, Thermostats",
    publisher: "Natural Resources Canada (published on Canada.ca)",
    url: "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html",
    detail: "Setback saving rule of thumb and the 17 °C lower limit",
    licence: "Government of Canada terms; short quote with credit",
  },
  nrcanSmart: {
    id: "nrcanSmart",
    title: "Smart thermostats (ENERGY STAR Canada)",
    publisher: "Natural Resources Canada",
    url: "https://natural-resources.canada.ca/energy-efficiency/energy-star/products/list-certified-products/smart-thermostats",
    detail: "Guide temperatures: 17 °C asleep or away, 20 °C awake and at home; two to three degrees of setback",
    licence: "Government of Canada terms; short quote with credit",
  },
  nrcanHeatPump: {
    id: "nrcanHeatPump",
    title: "Heating and cooling with a heat pump",
    publisher: "Natural Resources Canada",
    url: "https://natural-resources.canada.ca/energy-efficiency/energy-star/heating-cooling-heat-pump",
    detail: "Typical air-source COP ranges at 8 °C and –8 °C; minimum operating temperature; advice on setbacks",
    licence: "Government of Canada terms; short quote with credit",
  },
  canmetCcht: {
    id: "canmetCcht",
    title:
      "Cooling and heating season performance assessment of cold climate air source heat pumps at the Canadian Centre for Housing Technology (ducted, 2013; mini-split, 2014)",
    publisher: "Natural Resources Canada, CanmetENERGY",
    url: "https://natural-resources.canada.ca/maps-tools-publications/publications/cooling-heating-season-performance-assessment-mini-split-cold-climate-air-source-heat-pump-canadian-centre-housing-technology",
    detail: "Field-measured heating COP of about 2.3 at –15 °C and 3.1 at +9 °C (mini-split); 1.5 at –21.1 °C and 3.0 at +4.9 °C (ducted)",
    licence: "Government of Canada terms; reproduced with credit",
  },
  furnaceRegs: {
    id: "furnaceRegs",
    title: "Energy Efficiency Regulations, 2016 (SOR/2016-311), section 259, gas furnaces",
    publisher: "Government of Canada, Justice Laws Website",
    url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2016-311/section-259.html",
    detail: "Minimum AFUE: 90% for furnaces made from December 31, 2009 to July 2, 2019; 95% from July 3, 2019",
    licence: "Reproduction of federal law is permitted with credit",
  },
  heatingWithGas: {
    id: "heatingWithGas",
    title: "Heating with Gas (revised October 2012), Table 1",
    publisher: "Natural Resources Canada",
    url: "https://natural-resources.canada.ca/sites/nrcan/files/energy/pdf/energystar/Heating_With_Gas.pdf",
    detail: "Seasonal efficiency (AFUE): old furnace with standing pilot 60%; mid-efficiency 78–84%; condensing 90–98%",
    licence: "Government of Canada terms; reproduced with credit",
  },
  ceudOntario: {
    id: "ceudOntario",
    title: "Comprehensive Energy Use Database, Residential Sector, Ontario, 2023",
    publisher: "Natural Resources Canada, Office of Energy Efficiency",
    url: "https://oee.nrcan.gc.ca/corporate/statistics/neud/dpa/menus/trends/comprehensive/trends_res_on.cfm",
    detail: "Table 32, gross output thermal requirements per household by building type and vintage",
    licence: "Open Government Licence – Canada",
  },
  iso13790: {
    id: "iso13790",
    title: "Buildings.ThermalZones.ISO13790.Data (building mass classes of the ISO 13790 simple hourly method)",
    publisher: "Lawrence Berkeley National Laboratory, Modelica Buildings Library v10.1.1",
    url: "https://simulationresearch.lbl.gov/modelica/releases/v10.1.1/help/Buildings_ThermalZones_ISO13790_Data.html",
    detail: "Heat capacity per square metre of floor area: light 110,000 J/K, medium 165,000 J/K, heavy 260,000 J/K",
    licence: "Modelica Buildings Library licence (BSD 3-Clause style); values quoted with credit",
  },
  cmhc: {
    id: "cmhc",
    title: "Effects of Thermostat Setting on Energy Consumption, Research Highlight, Technical Series 05-100 (June 2005)",
    publisher: "Canada Mortgage and Housing Corporation",
    url: "https://assets.cmhc-schl.gc.ca/sf/project/archive/publications/rhse-penrse/63816.pdf",
    detail: "Test house in Ottawa: 18 °C night setback from 22 °C (11 p.m. to 6 a.m.) predicted to save 6.5% of winter furnace gas",
    licence: "CMHC terms; figures reproduced with credit",
  },
  openMeteo: {
    id: "openMeteo",
    title: "Open-Meteo Historical Weather API",
    publisher: "Open-Meteo.com",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    detail:
      "Hourly temperature_2m, default best-match model (ECMWF IFS, ERA5 and ERA5-Land reanalysis). Zippenfenig, P. (2023), Open-Meteo.com Weather API, Zenodo, doi:10.5281/ZENODO.7970649. Contains Copernicus Climate Change Service information.",
    licence: "CC BY 4.0",
  },
  oebElectricity: {
    id: "oebElectricity",
    title: "Electricity rates (Regulated Price Plan prices set for November 1, 2026)",
    publisher: "Ontario Energy Board",
    url: "https://www.oeb.ca/consumer-information-and-protection/electricity-rates",
    detail: "Tiered: 11.2 ¢/kWh (Tier 1), 13.2 ¢/kWh (Tier 2). Time-of-Use: 9.1, 14.6 and 18.9 ¢/kWh. Energy line of the bill only.",
    licence: "Credited to the OEB as its website terms require",
  },
  oebGas: {
    id: "oebGas",
    title: "Natural gas rates",
    publisher: "Ontario Energy Board",
    url: "https://www.oeb.ca/consumer-information-and-protection/natural-gas-rates",
    detail: "Where to find the current price per cubic metre for your gas utility",
    licence: "Credited to the OEB as its website terms require",
  },
} as const satisfies Record<string, SourceRef>;

export type SourceId = keyof typeof SOURCES;

// ---------------------------------------------------------------------------
// Natural gas
// ---------------------------------------------------------------------------

/** Higher heating value of natural gas, MJ per cubic metre. Cited: ECCC, Table 8. */
export const GAS_HHV_MJ_PER_M3 = 38.39;

/** 100-year global warming potentials (IPCC AR5), as used by ECCC. Cited. */
export const GWP_CH4 = 28;
export const GWP_N2O = 265;

/** Residential natural gas combustion, g per cubic metre. Cited: NIR Table A6.1-4 (national values). */
export const GAS_CH4_G_PER_M3 = 0.037;
export const GAS_N2O_G_PER_M3 = 0.035;

export type ProvinceCode = "ON" | "QC" | "AB" | "BC";

export interface ProvinceFactors {
  code: ProvinceCode;
  name: string;
  /** Marketable natural gas, g CO2 per cubic metre, 2024. Cited: NIR Table A6.1-1. */
  gasCo2GPerM3: number;
  /** Grid electricity consumption intensity, g CO2e per kWh, 2024 (preliminary). Cited: NIR Annex 7. */
  gridGPerKWh: number;
  /** NIR Annex 7 table number for this province. */
  gridTable: string;
}

export const PROVINCES: Record<ProvinceCode, ProvinceFactors> = {
  ON: { code: "ON", name: "Ontario", gasCo2GPerM3: 1921, gridGPerKWh: 73, gridTable: "A7-7" },
  QC: { code: "QC", name: "Quebec", gasCo2GPerM3: 1926, gridGPerKWh: 2.6, gridTable: "A7-6" },
  AB: { code: "AB", name: "Alberta", gasCo2GPerM3: 1962, gridGPerKWh: 346, gridTable: "A7-10" },
  BC: { code: "BC", name: "British Columbia", gasCo2GPerM3: 1966, gridGPerKWh: 18, gridTable: "A7-11" },
};

/** Calculated: CO2 + CH4 x GWP + N2O x GWP, in kg CO2e per cubic metre of natural gas. */
export function gasKgCo2ePerM3(province: ProvinceCode): number {
  const p = PROVINCES[province];
  return (p.gasCo2GPerM3 + GAS_CH4_G_PER_M3 * GWP_CH4 + GAS_N2O_G_PER_M3 * GWP_N2O) / 1000;
}

export function emissionFactorsFor(province: ProvinceCode): EmissionFactors {
  return {
    gasMJPerM3: GAS_HHV_MJ_PER_M3,
    gasKgCo2ePerM3: gasKgCo2ePerM3(province),
    gridKgCo2ePerKWh: PROVINCES[province].gridGPerKWh / 1000,
  };
}

// ---------------------------------------------------------------------------
// Natural Resources Canada guidance (quotes are character-exact, read on the live pages)
// ---------------------------------------------------------------------------

export const NRCAN_GUIDANCE = {
  /** Keeping the Heat In, section 9.1.2. */
  setbackQuote:
    "A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption.",
  /** The rule of thumb above, as numbers. */
  setbackDropC: 1,
  setbackHours: 8,
  setbackSavingPct: 2,
  /** Keeping the Heat In, section 9.1.2. */
  floorQuote:
    "In general, it is best not to reduce the temperature lower than 17°C (63°F), as there is a risk of moisture build-up in the exterior walls.",
  floorC: 17,
  /** Smart thermostats page. */
  guideQuote:
    "A good guide is to program 17°C when you are sleeping or not at home, and 20°C when you are awake and at home.",
  /** Heating and cooling with a heat pump. */
  heatPumpQuote: "Moderated setbacks of not more than 2°C should be employed",
  heatPumpMaxSetbackC: 2,
} as const;

/** CMHC test-house result used as a second, independent comparison. Cited. */
export const CMHC_BENCHMARK = {
  baselineC: 22,
  setbackC: 18,
  startMin: 23 * 60,
  endMin: 6 * 60,
  savingPct: 6.5,
} as const;
