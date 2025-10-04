// /components/WeatherDetails.js
"use client";

import {
  FaWind,
  FaTint,
  FaSun,
  FaThermometerHalf,
  FaCloudShowersHeavy,
  FaSeedling,
  FaSmog,
  FaRegSmile,
  FaMoon,
} from "react-icons/fa";

import {  WiMoonNew, WiMoonWaxingCrescent2 ,WiMoonWaxingGibbous3, WiMoonFirstQuarter, WiMoonFull, WiMoonWaningGibbous2, WiMoonThirdQuarter, WiMoonWaningCrescent5  } from "react-icons/wi";


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
  const val = Math.floor(num / 22.5 + 0.5);
  const arr = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW"
  ];
  return arr[val % 16];
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
    if (v <= table[i][0])
      return { force: table[i][1].split(" ")[0], label: table[i][1] };
  }
  return { force: "—", label: "—" };
}

function getMoonPhaseName(phase) {
  if (phase == null) return "—";
  if (phase === 0 || phase === 1) return "New Moon";
  if (phase < 0.25) return "Waxing Crescent";
  if (phase === 0.25) return "First Quarter";
  if (phase < 0.5) return "Waxing Gibbous";
  if (phase === 0.5) return "Full Moon";
  if (phase < 0.75) return "Waning Gibbous";
  if (phase === 0.75) return "Last Quarter";
  return "Waning Crescent";
}

function getMoonPhaseEmoji(phase) {
  if (phase == null) return "—";
  if (phase === 0 || phase === 1) return <WiMoonNew className="text-yellow-300 text-7xl" />; // New Moon
  if (phase < 0.25) return <WiMoonWaxingCrescent2 className="text-yellow-300 text-7xl" />; // Waxing Crescent
  if (phase === 0.25) return <WiMoonFirstQuarter className="text-yellow-300 text-7xl" />; // First Quarter
  if (phase < 0.5) return <WiMoonWaxingGibbous3 className="text-yellow-300 text-7xl" />; // Waxing Gibbous
  if (phase === 0.5) return <WiMoonFull className="text-yellow-300 text-7xl" />; // Full Moon
  if (phase < 0.75) return <WiMoonWaningGibbous2 className="text-yellow-300 text-7xl" />; // Waning Gibbous
  if (phase === 0.75) return <WiMoonThirdQuarter className="text-yellow-300 text-7xl"  />; // Last Quarter
  return <WiMoonWaningCrescent5 className="text-yellow-300 text-7xl" />; // Waning Crescent
}

export default function WeatherDetails({ weatherData }) {
  if (!weatherData) return null;

  const { current = {}, daily = {}, hourly = {} } = weatherData;

  // Primary values
  const temp = current.temperature ?? null;
  const feelsLike =
    current.apparent_temperature ??
    (temp != null && current.windspeed != null
      ? Math.round(temp - current.windspeed / 10)
      : null);

  const windKmh = current.windspeed ?? null;
  const windDirDeg = current.winddirection ?? current.winddir ?? null;
  const humidity = hourly?.relativehumidity_2m?.[0] ?? current.relativehumidity ?? null;
  const precip24 = daily?.precipitation_sum?.[0] ?? null;
  const uvIndex = daily?.uv_index_max?.[0] ?? null;
  const pressure = current.pressure ?? daily?.surface_pressure_mean?.[0] ?? null;
  const dewPoint = calcDewPoint(temp, humidity);
  const windGust = current.windgust ?? current.windspeed_10m ?? null;

  // Sunrise / Sunset
  const sunrise = daily?.sunrise?.[0] ? new Date(daily.sunrise[0]) : null;
  const sunset = daily?.sunset?.[0] ? new Date(daily.sunset[0]) : null;
  let dayLength = "—";
  if (sunrise && sunset) {
    const diff = sunset - sunrise;
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    dayLength = `${hrs}h ${mins}m`;
  }

  // Robust Moon data
  const moonrise = Array.isArray(daily?.moonrise) ? new Date(daily.moonrise[0]) : daily?.moonrise ? new Date(daily.moonrise) : null;
  const moonset = Array.isArray(daily?.moonset) ? new Date(daily.moonset[0]) : daily?.moonset ? new Date(daily.moonset) : null;
  const moonPhase = Array.isArray(daily?.moonphase) ? daily.moonphase[0] : daily?.moonphase ?? null;
  const moonEmoji = getMoonPhaseEmoji(moonPhase);

  const windCompass = degToCompass(windDirDeg);
  const gustKmh = windGust ?? null;
  const beaufortInfo = beaufort(gustKmh ?? windKmh ?? 0);
  const aqi = weatherData.aqi ?? 40; // placeholder
  const pollen = weatherData.pollen ?? 10; // placeholder

  const cards = [
    {
      id: "temp",
      title: "Temperature",
      value: fmt(temp, "°"),
      small: "Steady",
      note: `Currently ${fmt(temp, "°")}. Tomorrow expected to be colder.`
    },
    {
      id: "feels",
      title: "Feels like",
      value: fmt(feelsLike, "°"),
      small: windKmh && windKmh > 12 ? "Wind factor" : "Temperature factor",
      note: `Feels ${feelsLike != null && temp != null && feelsLike < temp ? "colder" : "similar"} than actual due to conditions.`
    },
    {
      id: "moon",
      title: "Moon",
      value: moonPhase != null ? (
        <span className="flex items-center gap-2">
          <span >{moonEmoji}</span>
          <span>{Math.round(moonPhase * 100)}%</span>
        </span>
      ) : "—",
      small: moonrise && moonset
        ? `${moonrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} / ${moonset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "—",
      note: "", // optional
    },


    {
      id: "precip",
      title: "Precipitation (24h)",
      value: precip24 != null ? `${precip24} cm` : "0 cm",
      small: "In next 24h",
      note: precip24 && precip24 > 0 ? "Light rain expected" : "No precipitation expected."
    },
    {
      id: "wind",
      title: "Wind",
      value: windCompass !== "—" ? `${windCompass} (${windDirDeg}°)` : "—",
      small: windKmh != null ? fmt(windKmh, " km/h") : "—",
      note: `Direction: ${windCompass} ${windDirDeg ? `(${Math.round(windDirDeg)}°)` : ""}`
    },
    {
      id: "humidity",
      title: "Humidity",
      value: fmt(humidity, "%"),
      small: "Relative Humidity",
      note: `Currently ${fmt(humidity, "%")}.`
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
      note: `Tomorrow’s maximum UV: ${uvIndex ?? "—"}`
    },
    {
      id: "aqi",
      title: "AQI",
      value: fmt(aqi),
      small: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy",
      note: "Primary pollutant: O₃ (placeholder)."
    },  
  ];

  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Weather details</h3>
        <div className="text-sm text-gray-200">
          Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.id}
            className="bg-white/10 p-4 rounded-2xl flex flex-col justify-between h-full shadow-sm hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="text-[16px] text-gray-200">{c.title}</div>
              <div className="text-3xl text-white/90">
                {c.id === "wind" && <FaWind />}
                {c.id === "wind_gust" && <FaWind />}
                {c.id === "humidity" && <FaTint />}
                {c.id === "dew" && <FaTint />}
                {c.id === "uv" && <FaSun />}
                {c.id === "precip" && <FaCloudShowersHeavy />}
                {c.id === "aqi" && <FaSmog />}
                {c.id === "pollen" && <FaSeedling />}
                {c.id === "sun" && <FaSun />}
                {c.id === "moon" && <FaMoon />}
                {c.id === "temp" && <FaThermometerHalf />}
                {!["wind","wind_gust","humidity","dew","uv","precip","aqi","pollen","sun","moon","temp"].includes(c.id) && <FaRegSmile />}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-4xl font-bold">{c.value}</div>
              <div className="text-sm text-gray-200 mt-1">{c.small}</div>
              {c.note && <p className="text-xs text-gray-300 mt-2">{c.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
