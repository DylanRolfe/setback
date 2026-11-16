# Data notice

The `weather-*.json` files in this folder are derived from the
[Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)
and are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), not MIT.

Weather data by [Open-Meteo.com](https://open-meteo.com/).

Changes made: downloaded by `scripts/fetch-weather.mjs`, trimmed to the local heating season
(Oct 1, 2025 to Apr 30, 2026), rounded to 0.1 °C. The exact request URL is stored in each file.

Zippenfenig, P. (2023). Open-Meteo.com Weather API. Zenodo. https://doi.org/10.5281/ZENODO.7970649
Contains Copernicus Climate Change Service information (ERA5, ERA5-Land).
