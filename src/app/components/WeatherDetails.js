// /components/WeatherDetails.js
"use client";

import {
  FaWind,
  FaTint,
  FaSun,
  FaCloud,
  FaEye,
  FaThermometerHalf,
  FaMoon,
  FaCloudShowersHeavy,
  FaSeedling,
  FaSmog,
  FaRegSmile,
} from "react-icons/fa";

function fmt(v, unit = "") {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v}${unit}`;
}

// Magnus formula for dew point (T °C, RH %)
function calcDewPoint(T, RH) {
  if (T == null || RH == null) return null;
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * T) / (b + T) + Math.log(RH / 100);
  const dp = (b * alpha) / (a - alpha);
  return Math.round(dp);
}

function degToCompass(num) {
  if (num == null) return "—";
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return arr[(val % 16)];
}

function beaufort(wKmh) {
  if (wKmh == null) return { force: "—", label: "—" };
  const v = wKmh;
  const table = [
    [1, "0"], [5, "1 (Light air)"], [11, "2 (Light breeze)"], [19, "3 (Gentle breeze)"],
    [28, "4 (Moderate breeze)"], [38, "5 (Fresh breeze)"], [49, "6 (Strong breeze)"],
    [61, "7 (Near gale)"], [74, "8 (Gale)"], [88, "9 (Strong gale)"],
    [102, "10 (Storm)"], [117, "11 (Violent storm)"], [9999, "12 (Hurricane)"]
  ];
  for (let i = 0; i < table.length; i++) {
    if (v <= table[i][0]) return { force: table[i][1].split(" ")[0], label: table[i][1] };
  }
  return { force: "—", label: "—" };
}

export default function WeatherDetails({ weatherData }) {
  if (!weatherData) return null;

  const { current = {}, daily = {}, hourly = {} } = weatherData;

  // Primary values (try to use existing fields, otherwise fallbacks)
  const temp = current.temperature ?? null;
  // Open-Meteo may provide apparent_temperature in hourly or current - try to find it
  const feelsLike = (current.apparent_temperature ?? (temp != null && current.windspeed != null ? Math.round(temp - (current.windspeed / 10)) : null));
  const windKmh = current.windspeed ?? null; // Open-Meteo uses m/s? we assume km/h here depending on query. If m/s convert: *3.6. Adjust according to your API query units.
  const windDirDeg = current.winddirection ?? current.winddir ?? null;
  const humidity = (hourly?.relativehumidity_2m?.[0] ?? current.relativehumidity ?? null);
  const cloudCover = (hourly?.cloudcover?.[0] ?? daily?.cloudcover?.[0] ?? null);
  const precip24 = (daily?.precipitation_sum?.[0] ?? null);
  const uvIndex = daily?.uv_index_max?.[0] ?? null;
  const pressure = current.pressure ?? daily?.surface_pressure_mean?.[0] ?? null;
  const visibility = current.visibility ?? null; // may be meters; adapt if needed
  const dewPoint = calcDewPoint(temp, humidity);
  const windGust = current.windgust ?? current.windspeed_10m ?? null;
  const moonPhase = (daily?.moon_phase?.[0] != null ? Math.round(daily.moon_phase[0] * 100) : null);
  const moonrise = daily?.moonrise?.[0] ?? null;
  const moonset = daily?.moonset?.[0] ?? null;
  const moonDuration = (moonrise && moonset) ? (() => {
    try {
      const r = new Date(moonrise);
      const s = new Date(moonset);
      let diff = Math.abs(s - r);
      if (s < r) diff = 24*60*60*1000 - diff;
      const hrs = Math.floor(diff / (1000*60*60));
      const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
      return `${hrs} hrs ${mins} mins`;
    } catch {
      return "—";
    }
  })() : "—";

  // Friendly strings
  const windCompass = degToCompass(windDirDeg);
  const gustKmh = windGust ?? null;
  const beaufortInfo = beaufort(gustKmh ?? windKmh ?? 0);
  const aqi = weatherData.aqi ?? 40; // placeholder
  const pollen = weatherData.pollen ?? 10; // placeholder

  // Compose 13 cards
  const cards = [
    {
      id: "temp",
      title: "Temperature",
      value: fmt(temp, "°"),
      small: "Steady",
      note: `Steady at current value of ${fmt(temp, "°")}. Tomorrow expected to be colder than today.`
    },
    {
      id: "feels",
      title: "Feels like",
      value: fmt(feelsLike, "°"),
      small: `Dominant factor: ${windKmh && windKmh > 12 ? "wind" : "temperature"}`,
      note: `Feels ${feelsLike != null && temp != null && feelsLike < temp ? "colder" : "similar"} than the actual temperature due to ${windKmh && windKmh > 12 ? "the wind" : "conditions"}.`
    },
    {
      id: "cloud",
      title: "Cloud cover",
      value: fmt(cloudCover, "%"),
      small: cloudCover != null ? "Mostly Clear" : "—",
      note: `Steady with partly cloudy sky at 02:00. Tomorrow expected to see less cloud cover than today.`
    },
    {
      id: "precip",
      title: "Precipitation (24h)",
      value: precip24 != null ? `${precip24} cm` : "0 cm",
      small: "In next 24h",
      note: precip24 && precip24 > 0 ? "Light rain expected" : "No Precipitation. Tomorrow expected similar."
    },
    {
      id: "wind",
      title: "Wind",
      value: (windCompass !== "—" ? `${windCompass} (${windDirDeg}°)` : "—"),
      small: windKmh != null ? `${fmt(windKmh, " km/h")}` : "—",
      note: `Direction: ${windCompass}${windDirDeg ? ` (${Math.round(windDirDeg)}°)` : ""}.`
    },
    {
      id: "wind_gust",
      title: "Wind gust / Force",
      value: fmt(gustKmh ?? windKmh, " km/h"),
      small: `Force: ${beaufortInfo.force}`,
      note: `Average ${fmt(windKmh, " km/h")} with gusts to ${fmt(gustKmh, " km/h")}.`
    },
    {
      id: "humidity",
      title: "Humidity",
      value: fmt(humidity, "%"),
      small: "Relative Humidity",
      note: `Steady at ${fmt(humidity, "%")}. Tomorrow's humidity expected similar.`
    },
    {
      id: "dew",
      title: "Dew point",
      value: dewPoint != null ? `${dewPoint}°` : "—",
      small: "Comfort",
      note: dewPoint != null ? "Normal" : "—"
    },
    {
      id: "uv",
      title: "UV index",
      value: fmt(uvIndex),
      small: uvIndex != null ? (uvIndex <= 2 ? "Low" : uvIndex <= 5 ? "Moderate" : "High") : "—",
      note: `Tomorrow's maximum UV level will be ${uvIndex != null ? (uvIndex <=2 ? "low" : uvIndex<=5 ? "moderate" : "high") : "—"}.`
    },
    {
      id: "aqi",
      title: "AQI",
      value: fmt(aqi),
      small: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy",
      note: `Deteriorating air quality with primary pollutant: O₃ 19 ppb.` // placeholder text
    },
    {
      id: "pollen",
      title: "Pollen",
      value: fmt(pollen),
      small: "Main Allergy: Grass",
      note: "Low. Tomorrow's pollen count expected to be similar."
    },
    {
      id: "vision_pressure",
      title: "Visibility / Pressure",
      value: `${visibility ? (visibility > 1000 ? `${Math.round(visibility/1000)} km` : `${visibility} m`) : "—"} / ${fmt(pressure, " mb")}`,
      small: "Excellent / Rising slowly",
      note: "Visibility & pressure expected to be similar; pressure rising slowly."
    },
    {
      id: "moon",
      title: "Moon",
      value: moonPhase != null ? `${moonPhase}%` : "—",
      small: moonDuration || "—",
      note: (moonrise && moonset) ? `Moonrise ${new Date(moonrise).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Moonset ${new Date(moonset).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "—"
    }
  ];

  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Weather details</h3>
        <div className="text-sm text-gray-200">Updated {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.id}
            className="bg-white/10 p-4 rounded-2xl flex flex-col justify-between h-full shadow-sm hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-200">{c.title}</div>
              <div className="text-2xl text-white/90">
                {c.id === "wind" && <FaWind />}
                {c.id === "wind_gust" && <FaWind />}
                {c.id === "humidity" && <FaTint />}
                {c.id === "dew" && <FaTint />}
                {c.id === "uv" && <FaSun />}
                {c.id === "cloud" && <FaCloud />}
                {c.id === "precip" && <FaCloudShowersHeavy />}
                {c.id === "aqi" && <FaSmog />}
                {c.id === "pollen" && <FaSeedling />}
                {c.id === "vision_pressure" && <FaEye />}
                {c.id === "moon" && <FaMoon />}
                {c.id === "temp" && <FaThermometerHalf />}
                {!["wind","wind_gust","humidity","dew","uv","cloud","precip","aqi","pollen","vision_pressure","moon","temp"].includes(c.id) && <FaRegSmile />}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-sm text-gray-300 mt-1">{c.small}</div>
              {c.note && <p className="text-xs text-gray-400 mt-2">{c.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
