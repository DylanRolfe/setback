# Sources and assumptions

Every number Setback shows is one of three things:

1. **Computed** by the model from the inputs on screen.
2. **Cited**: taken from a public source below. Each cited value was read on the live page or file on **2026-11-15**.
3. **Estimate**: an assumption, labeled "estimate" in the app, with its basis listed here. The user can change the main ones.

The same constants live in code in [`lib/sim/factors.ts`](../lib/sim/factors.ts) and
[`lib/sim/presets.ts`](../lib/sim/presets.ts). The app's "Sources and assumptions" panel is generated from those files
([`lib/sim/assumptions.ts`](../lib/sim/assumptions.ts)), so the panel, this document and the model cannot drift apart silently.

## 1. Weather (cited)

| Item | Value |
| --- | --- |
| Data | Hourly air temperature at 2 m, 5,088 hours per city, local Oct 1, 2025 00:00 to Apr 30, 2026 23:00 |
| Cities | Waterloo ON, Toronto ON, Montreal QC, Calgary AB, Vancouver BC |
| Source | Open-Meteo Historical Weather API, <https://open-meteo.com/en/docs/historical-weather-api> |
| Endpoint | `https://archive-api.open-meteo.com/v1/archive` (default "best match" model: ECMWF IFS, ERA5 and ERA5-Land) |
| Licence | CC BY 4.0, <https://open-meteo.com/en/licence> |
| Credit | Weather data by [Open-Meteo.com](https://open-meteo.com/). Zippenfenig, P. (2023). Open-Meteo.com Weather API. Zenodo. doi:10.5281/ZENODO.7970649. Contains Copernicus Climate Change Service information (ERA5: Hersbach et al., 2023, doi:10.24381/cds.adbb2d47; ERA5-Land: Muñoz Sabater, 2019, doi:10.24381/CDS.E2161BAC). |
| Changes made | Downloaded once at build time by [`scripts/fetch-weather.mjs`](../scripts/fetch-weather.mjs), trimmed to the local season, rounded to 0.1 °C, saved as static JSON in `public/data/`. The exact request URL is stored inside each file. |

This is reanalysis and model data for a grid cell near each city, not a weather-station record, and it is one past season.
Waterloo, this season: mean 0.1 °C, coldest hour -26.2 °C.

## 2. Emission factors (cited)

### Natural gas

| Constant | Value | Source |
| --- | --- | --- |
| CO2, marketable natural gas, Ontario | 1 921 g/m³ | NIR 1990–2024 (2026 edition), Annex 6, Table A6.1-1, 2024 row |
| Same, Quebec / Alberta / British Columbia | 1 926 / 1 962 / 1 966 g/m³ | Same table |
| CH4, residential | 0.037 g/m³ | NIR 1990–2024, Annex 6, Table A6.1-4, row "Residential, Construction, Commercial/Institutional, Agriculture" |
| N2O, residential | 0.035 g/m³ | Same table |
| Global warming potential, 100-year | CH4 = 28, N2O = 265 (IPCC AR5) | ECCC, "Global warming potentials" |
| Higher heating value | 38.39 MJ/m³ | ECCC, "Emission factors and reference values" v4.0, Table 8 |

- NIR Annex 6 files: <https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/D-Emission-Factors/?lang=en>
- ECCC, Emission factors and reference values, version 4.0 (September 2026), Tables 1.4, 2.4 and 8 (reproduce the NIR values):
  <https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html>
- ECCC, Global warming potentials:
  <https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html>

**Calculated:** CO2e per cubic metre = CO2 + CH4 × 28 + N2O × 265. For Ontario: 1 921 + 0.037 × 28 + 0.035 × 265 = **1 931.3 g CO2e/m³ (1.931 kg/m³)**.

Notes: combustion only (no upstream production or leaks). The annex does not state the reference temperature and pressure of the cubic metre.

### Grid electricity

| Province | Consumption intensity, 2024 | NIR 1990–2024, Annex 7 |
| --- | --- | --- |
| Ontario | 73 g CO2e/kWh | Table A7-7 |
| Quebec | 2.6 g CO2e/kWh | Table A7-6 |
| Alberta | 346 g CO2e/kWh | Table A7-10 |
| British Columbia | 18 g CO2e/kWh | Table A7-11 |

- NIR Annex 7 files: <https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/C-Tables-Electricity-Canada-Provinces-Territories/?lang=en>
- The same rounded values appear in ECCC "Emission factors and reference values" v4.0, Table 5.4.

Notes: "consumption intensity" is the intensity of electricity as delivered to the consumer (it includes line losses).
The 2024 column is marked preliminary in the source. These are yearly provincial averages, not hour-by-hour or marginal
values, so they do not capture which power plants respond when one home uses less on a cold evening.

### Licence

Canada's Official Greenhouse Gas Inventory is published under the
[Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).
Contains information licensed under the Open Government Licence – Canada.

## 3. Published guidance used for the sanity check and the suggestion (cited, quoted exactly)

| Quote | Source |
| --- | --- |
| "A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption." | Natural Resources Canada, *Keeping the Heat In*, section 9.1.2 "Thermostats", <https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html> |
| "In general, it is best not to reduce the temperature lower than 17°C (63°F), as there is a risk of moisture build-up in the exterior walls." | Same section |
| "A good guide is to program 17°C when you are sleeping or not at home, and 20°C when you are awake and at home." | Natural Resources Canada, "Smart thermostats", <https://natural-resources.canada.ca/energy-efficiency/energy-star/products/list-certified-products/smart-thermostats> |
| "Moderated setbacks of not more than 2°C should be employed" (for heat pumps) | Natural Resources Canada, "Heating and cooling with a heat pump", <https://natural-resources.canada.ca/energy-efficiency/energy-star/heating-cooling-heat-pump> |

Second comparison (figures, not a quote): Canada Mortgage and Housing Corporation, Research Highlight, Technical Series 05-100
(June 2005), "Effects of Thermostat Setting on Energy Consumption". For a test house in Ottawa with a mid-efficiency furnace,
an 18 °C night setback from 22 °C (11 p.m. to 6 a.m.) was predicted to save 6.5% of winter furnace gas.
<https://assets.cmhc-schl.gc.ca/sf/project/archive/publications/rhse-penrse/63816.pdf>

## 4. Heating systems

| Constant | Value | Kind | Basis |
| --- | --- | --- | --- |
| Gas furnace efficiency, default | 95% AFUE | cited | Minimum for gas furnaces made on or after July 3, 2019. Energy Efficiency Regulations, 2016 (SOR/2016-311), s. 259, <https://laws-lois.justice.gc.ca/eng/regulations/SOR-2016-311/section-259.html>. The default is the current minimum because it gives the smallest absolute saving (conservative). |
| Other furnace choices | 90%; 80%; 60% | cited | 90%: minimum for furnaces made Dec 31, 2009 to July 2, 2019 (same regulation). 80% (mid-efficiency, range 78–84%) and 60% (old furnace with standing pilot): NRCan, *Heating with Gas* (2012), Table 1, <https://natural-resources.canada.ca/sites/nrcan/files/energy/pdf/energystar/Heating_With_Gas.pdf> |
| Electric baseboard | COP 1 | model setting | All electricity used by a resistance heater becomes heat in the room. |
| Heat pump COP | 3.7 at 8 °C, 2.4 at -8 °C, 1.0 at -25 °C; straight lines between; flat above 8 °C; never below 1 | **estimate** | Midpoints of NRCan's typical air-source ranges ("At 8°C ... between 2.0 and 5.4", "At –8°C, COPs can range from 1.1 to 3.7") from "Heating and cooling with a heat pump". The -25 °C point is the bottom of NRCan's stated minimum operating range (-15 °C to -25 °C), where backup resistance heat (COP 1) takes over. Cross-check: CanmetENERGY field tests at the Canadian Centre for Housing Technology measured about 2.3 at -15 °C and 3.1 at +9 °C (mini-split) and 1.5 at -21.1 °C (ducted); this curve gives 1.8 at -15 °C and 1.3 at -21 °C, so it is on the low (conservative) side of those units. <https://natural-resources.canada.ca/maps-tools-publications/publications/cooling-heating-season-performance-assessment-mini-split-cold-climate-air-source-heat-pump-canadian-centre-housing-technology> |

## 5. Home presets (estimates)

UA and C are **estimates, not measurements of any real home**. Users can edit them.

| Preset | Floor area | UA | C | Time constant C/UA |
| --- | --- | --- | --- | --- |
| Apartment | 70 m² | 80 W/K | 11.6 MJ/K | 40 h |
| Townhouse | 140 m² | 145 W/K | 15.4 MJ/K | 30 h |
| Detached house | 180 m² | 220 W/K | 19.8 MJ/K | 25 h |

**Basis for UA.** We found no public source that gives a typical whole-home UA for Canadian homes directly, so UA was chosen
so that the model's seasonal heat output is plausible against national statistics. With a constant 21 °C in Waterloo's
2025–26 season the presets deliver 30.6, 55.4 and 84.1 GJ of heat. NRCan's Comprehensive Energy Use Database (Ontario,
2023, Table 32, "gross output thermal requirements" per household) reports, by construction period:

| Building type | Lowest vintage class | 1961–1995 classes | Highest vintage class |
| --- | --- | --- | --- |
| Apartments | 22.6 GJ | 27.5 to 35.0 GJ | 68.7 GJ |
| Single attached | 38.2 GJ | 54.8 to 64.5 GJ | 121.5 GJ |
| Single detached | 64.2 GJ | 77.2 to 91.6 GJ | 150.5 GJ |

Source: <https://oee.nrcan.gc.ca/corporate/statistics/neud/dpa/menus/trends/comprehensive/trends_res_on.cfm> (Open Government Licence – Canada).
The presets sit in the range of homes built between 1961 and 1995. This is a plausibility check, not a calibration to
any one home: the statistics are provincial averages for 2023 (a mild year), and the model's weather is one city and one season.
A test (`lib/sim/__tests__/scenario.test.ts`) keeps each preset inside the published range.

**Basis for C.** Floor area × the heat capacity per square metre of the ISO 13790 building mass classes: light 110,000 J/K·m²
(wood-frame townhouse and detached house), medium 165,000 J/K·m² (apartment). Values as reproduced in the Lawrence Berkeley
National Laboratory Modelica Buildings Library (`Buildings.ThermalZones.ISO13790.Data`),
<https://simulationresearch.lbl.gov/modelica/releases/v10.1.1/help/Buildings_ThermalZones_ISO13790_Data.html>.
Those class values were defined for a more detailed hourly method. Using them as the single C of a 1R1C model is our assumption.

**Other estimates**

| Constant | Value | Basis |
| --- | --- | --- |
| Heater size | 1.5 × the heat needed to hold 22 °C in the coldest hour of the season | Our assumption. It only affects how fast the room warms back up. Editable. |
| Thermostat deadband | 0.5 °C wide | Our assumption. |
| Default routine | Weekdays: up 7:00, out 8:30 to 17:30, bed 23:00. Weekends: up 9:00, bed 23:30 | Illustrative example, not a real user. Editable. |
| Default comfort minimum | 20 °C while home and awake | Our assumption, matching NRCan's "20°C when you are awake and at home". Editable. |
| Suggested schedule | 21 °C at home; 3 °C lower asleep or out (2 °C for heat pumps); never below 17 °C | Our choice, inside NRCan's advice quoted in section 3. |
| Warm-up lead time | 30 to 180 minutes | Chosen by simulation: the shortest lead time that keeps the room below the comfort minimum for at most 1% of home-and-awake hours. |

## 6. Prices (optional, user input)

Setback does not assume an energy price. Cost appears only if the user types their own price.
For Ontario electricity the app points to the Ontario Energy Board's Regulated Price Plan prices set for November 1, 2026
(Tiered: 11.2 ¢/kWh and 13.2 ¢/kWh; Time-of-Use: 9.1, 14.6 and 18.9 ¢/kWh; energy line of the bill only):
<https://www.oeb.ca/consumer-information-and-protection/electricity-rates>. For gas it links to
<https://www.oeb.ca/consumer-information-and-protection/natural-gas-rates>. Credited to the OEB as its website terms require.

## 7. Sanity check: does the model agree with published guidance?

The app runs the published test cases through the model with the user's own home, city and heating system and shows the
result. For the default Waterloo example (apartment preset, gas furnace):

| Test case | Published figure | This model | Verdict |
| --- | --- | --- | --- |
| 22 °C all day versus 21 °C from 11 p.m. to 7 a.m. (1 °C lower for eight hours) | NRCan: "about 2 percent" (read as 1.5% to 2.5%) | 1.4% | **Below** |
| 22 °C all day versus 18 °C from 11 p.m. to 6 a.m. | CMHC test house, Ottawa: 6.5% (read as 6.0% to 7.0%) | 3.3% | **Below** |

**Honest reading.** The model lands below both published figures. We think two things explain most of the gap:

1. The model leaves out free heat from the sun, people and appliances. In a real home that free heat covers part of the
   loss, so the furnace's share is smaller and the same setback is a larger percentage of it.
2. A single thermal mass makes the room cool down slowly (time constant 25 to 40 hours for the presets), so the room
   spends less of the night at the lower temperature than a real room whose air cools faster than its structure.

Both effects make Setback's percentage **lean low**. The model was not tuned up to match, because that would mean
adding assumptions that cannot be cited. Across the five cities the NRCan case gives 1.3% to 2.0% for the apartment preset
with a gas furnace (inside NRCan's range only for Vancouver). The CMHC figure is for one house, one city and one winter,
so it is context rather than a pass/fail test.

## 8. The documented example, with every input

Scenario: Waterloo, apartment preset (UA 80 W/K, C 11.6 MJ/K, heater 5.8 kW), gas furnace at 95%, season Oct 1, 2025 to
Apr 30, 2026, illustrative routine from section 5, comfort minimum 20 °C.

- Before: 22 °C all day, every day.
- After (suggested): weekdays 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C; weekends 7:00 AM 21 °C, 11:30 PM 18 °C.

| | Before | After | Saved |
| --- | --- | --- | --- |
| Gas energy | 9,373 kWh | 8,546 kWh | 827 kWh (8.8%) |
| Natural gas | 879 m³ | 801 m³ | 78 m³ |
| CO2e | 1,697 kg | 1,548 kg | 150 kg |
| Mean indoor temperature | 22.0 °C | 20.1 °C | |
| Hours below 20 °C while home and awake (of 1,934) | 0 | 6.9 | |

Scaled linearly to 40 identical units (for example a residence floor): about 3,100 m³ of gas and about 5,990 kg CO2e per
season. This is a simulation under the stated assumptions, not a measured saving.
These numbers are pinned by `lib/sim/__tests__/example.test.ts`.

## 9. What was verified, and how

- Two research sub-agents fetched every source above on 2026-11-15 and reported values only when seen in the fetched
  content. The lead agent then re-read the ECCC "Emission factors and reference values" page (Tables 1.4, 2.4, 5.4, 8)
  and the NRCan wording independently, and checked that every source URL resolves.
- The NIR values were read from ECCC's standalone annex files (PDF and XLSX, "National Inventory Report – 2026 Edition"),
  not from the full report PDF. The global warming potentials were read on ECCC pages rather than in the NIR text.
- *Keeping the Heat In* is a Natural Resources Canada guide. It is currently published on Canada.ca under an
  Environment and Climate Change Canada address.
- Human review: Dylan Rolfe reads this list and opens the quoted pages himself before submitting
  (tracked in `docs/CHECKLIST.md`).
