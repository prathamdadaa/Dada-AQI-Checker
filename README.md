# 🌤️ Dada AQI Checker

A modern, responsive, glassmorphism-styled air quality web app. Search any city or use your current location to see live AQI, pollutant levels and weather.

**Created by Pratham Dada** – first-year BCA student at Indira Gandhi National Open University (IGNOU).

## Features

- **City search** (defaults to *Dhanbad, Jharkhand*) and a **Locate me** button using the browser Geolocation API
- **AQI card** with a large number, colour-coded status (Good, Moderate, Poor, Unhealthy, Severe, Hazardous), an interactive scale marker and health advice
- **Pollutant breakdown:** PM2.5, PM10, CO, SO₂, NO₂, O₃ (all in µg/m³)
- **Weather widget:** temperature, condition (Sunny / Hazy / Cloudy …), humidity, wind speed, UV index
- **Dynamic illustration:** a skyline that gets hazier, adds smoke, or switches to night as conditions change
- Backdrop gradient changes with the AQI level; light/dark glass theme toggle
- Loading skeletons, friendly error messages (city not found, offline, permission denied)
- Zero build step: HTML + Tailwind CSS (CDN) + vanilla JavaScript

## AQI scale used

| AQI | Status |
|---|---|
| 0–50 | Good |
| 51–100 | Moderate |
| 101–150 | Poor |
| 151–200 | Unhealthy |
| 201–300 | Severe |
| 301+ | Hazardous |

Values come from the **US AQI** reported by Open-Meteo, grouped into these six labels.

## APIs (free, no API key)

- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) – city name to coordinates
- [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) – AQI, pollutants, UV
- [Open-Meteo Forecast](https://open-meteo.com/en/docs) – temperature, humidity, wind, weather code
- [BigDataCloud reverse geocoding](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) – city name for "Locate me"

Open-Meteo's free tier is for non-commercial use.

## Project structure

```
dada-aqi-checker/
├── index.html   # Markup + Tailwind classes
├── style.css    # Glassmorphism, gradients, skeletons
├── script.js    # API calls, rendering, geolocation
└── README.md
```

## Run locally

Just open `index.html` in a browser. (Geolocation needs `https://` or `localhost`, so for "Locate me" use a local server: `python -m http.server 8000` and visit `http://localhost:8000`.)

## Deploy on GitHub Pages

1. **Create a repository** on GitHub, e.g. `dada-aqi-checker` (public).
2. **Upload the files:** click *Add file → Upload files*, drag in `index.html`, `style.css`, `script.js` and `README.md`, then *Commit changes*.
   Or with Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Dada AQI Checker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/dada-aqi-checker.git
   git push -u origin main
   ```
3. Open the repo's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/ (root)**, then click **Save**.
6. Wait 1–2 minutes. Your site will be live at:
   `https://<your-username>.github.io/dada-aqi-checker/`
7. Open the link and test it. GitHub Pages serves over HTTPS, so **Locate me** will work.

To update the site later, commit changes to `main`; Pages redeploys automatically.

## Troubleshooting

- **Blank styles:** Tailwind loads from a CDN, so check your internet connection.
- **"Locate me" does nothing:** allow location permission in the browser; use HTTPS or localhost.
- **City not found:** try just the city name, or `City, State` (e.g. `Ranchi, Jharkhand`).
- **Hard refresh after deploying:** `Ctrl + Shift + R`.

## Disclaimer

AQI figures are modelled/aggregated data and are informational only, not medical advice. Official local readings may differ.

## License

MIT – free to use and modify. Please keep the credit to Pratham Dada.
