// /src/app/components/CurrentWeather.js
"use client";

import {
  FaCloud,
  FaSnowflake,
} from "react-icons/fa";
import { IoIosSunny, IoIosRainy  } from "react-icons/io";

export default function CurrentWeather({ weatherData }) {
  if (!weatherData) return null;

  const { current = {}, hourly = {}, daily = {}, aqi: topAqi } = weatherData;

  const safeNum = (v) =>
    v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v));

  // Determine "feels like"
  let feelsLike = current.apparent_temperature ?? null;
  try {
    if (feelsLike == null && hourly?.time && hourly?.apparent_temperature && current?.time) {
      const idx = hourly.time.findIndex((t) => t === current.time);
      if (idx >= 0) feelsLike = hourly.apparent_temperature[idx];
    }
  } catch {}
  if (feelsLike == null) feelsLike = current.temperature;

  // Weather description
  const getDescription = (code) => {
    switch (code) {
      case 0: return "Clear";
      case 1: return "Mainly clear";
      case 2: return "Partly cloudy";
      case 3: return "Overcast";
      case 45:
      case 48: return "Fog";
      case 51:
      case 53:
      case 55:
      case 61:
      case 63:
      case 65:
      case 80:
      case 81:
      case 82: return "Rain";
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86: return "Snow";
      case 95:
      case 96:
      case 99: return "Thunderstorm";
      default: return "Cloudy";
    }
  };

  const getWeatherIcon = (code, isDay = true) => {
    if (code === 0) return <IoIosSunny className="text-yellow-500" size={90} />;
    if ([1, 2, 3].includes(code)) return <FaCloud size={90} />;
    if ([45, 48].includes(code)) return <FaCloud size={90} />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <IoIosRainy size={90} />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake size={90} />;
    return <FaCloud size={90} />;
  };

  // Determine day/night
  let isDay = true;
  try {
    if (current?.time && daily?.sunrise && daily?.sunset && Array.isArray(daily.time)) {
      const curDate = new Date(current.time);
      const dayIndex = daily.time.findIndex((t) => {
        const dt = new Date(t);
        return (
          dt.getFullYear() === curDate.getFullYear() &&
          dt.getMonth() === curDate.getMonth() &&
          dt.getDate() === curDate.getDate()
        );
      });
      if (dayIndex >= 0 && daily.sunrise[dayIndex] && daily.sunset[dayIndex]) {
        const sr = new Date(daily.sunrise[dayIndex]).getTime();
        const ss = new Date(daily.sunset[dayIndex]).getTime();
        isDay = curDate.getTime() >= sr && curDate.getTime() <= ss;
      } else {
        const hr = curDate.getHours();
        isDay = hr >= 6 && hr < 18;
      }
    } else if (current?.time) {
      const hr = new Date(current.time).getHours();
      isDay = hr >= 6 && hr < 18;
    }
  } catch {
    isDay = true;
  }

  // Primary numbers
  const description = getDescription(current?.weathercode ?? 0);
  const tempRounded = safeNum(current?.temperature);
  const feelsRounded = safeNum(feelsLike);
  const lowToday = safeNum(daily?.temperature_2m_min?.[0]);
  const windRounded = safeNum(current?.windspeed);

  // --- Fixed AQI: get single current value ---
  let aqi = null;
  if (topAqi != null) {
    aqi = topAqi;
  } else if (hourly?.time && (hourly?.us_aqi || hourly?.european_aqi)) {
    const curTime = current?.time;
    const idx = hourly.time.findIndex((t) => t === curTime);
    if (idx >= 0) {
      aqi = hourly.us_aqi?.[idx] ?? hourly.european_aqi?.[idx] ?? null;
    } else {
      aqi = hourly.us_aqi?.[0] ?? hourly.european_aqi?.[0] ?? null;
    }
  }

  const aqiLabel = (n) => {
    if (n == null) return "—";
    if (n <= 50) return "Good";
    if (n <= 100) return "Moderate";
    if (n <= 150) return "Unhealthy";
    if (n <= 200) return "Very unhealthy";
    return "Hazardous";
  };

  const humidity = safeNum(hourly?.relativehumidity_2m?.[0] ?? current?.relativehumidity_2m);
  const visibility = current?.visibility != null ? Math.round(current.visibility / 1000) : null;
  const pressure = current?.pressure ?? null;

  // Time
  const now = current?.time ? new Date(current.time) : new Date();
  const currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const buildLongDescription = () => {
    const code = current?.weathercode ?? 0;
    const short = getDescription(code).toLowerCase();

    let humAdj = "";
    if (typeof humidity === "number") {
      if (humidity >= 75) humAdj = "humid";
      else if (humidity >= 50) humAdj = "mildly humid";
      else humAdj = "dry";
    }

    const highToday = safeNum(daily?.temperature_2m_max?.[0]);
    const tempPhrase = highToday != null ? `The high will be ${highToday}°` : "";
    let intro = code === 0 ? "Expect sunny skies." : `Expect ${short}.`;

    return tempPhrase ? `${intro} ${tempPhrase}${humAdj ? ` on this ${humAdj} day.` : "."}` : intro;
  };

  const longDescription = buildLongDescription();

  return (
    <div className="rounded-2xl p-5 sm:p-6 text-white bg-white/5">
      {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-bold truncate">
            {weatherData.city ?? "—"}
            {weatherData.country ? `, ${weatherData.country}` : ""}
          </h2>
          <p className="text-[18px] text-gray-200 mt-1">{currentTime}</p>
        </div>

      {/* Main weather block */}
      <div className="flex flex-col sm:flex-row items-start gap-4 my-3 -4">
        <div className="inline-block">{getWeatherIcon(current?.weathercode ?? 0, isDay)}</div>

        <div className="flex flex-row items-center gap-7 -amber-400 -2 justify-center">
          <div className="flex flex-col items-start justify-center -red-500 -4">
            <p className="text-6xl font-medium text-white leading-tight">{tempRounded != null ? `${tempRounded}°C` : "—"}</p>
            <p className="text-[17px] text-gray-200 mt-1">{lowToday != null ? `Low: ${lowToday}°` : ""}</p>
          </div>

          <div className="flex flex-col items-start -blue-500 -4">
            <p className="text-[22px] text-gray-100 font-bold">{description}</p>
            <p className="text-[17px] sm:text-sm text-gray-200 mt-1">Feels like {feelsRounded != null ? `${feelsRounded}°` : "—"}</p>
          </div>
        </div>
      </div>

      <div className="text-[15px]">{longDescription}</div>

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-5 md:gap-8 mt-7 -3">
        {/* Air Quality */}
        <div className="text-center -amber-300 -2">
          <p className="text-xs sm:text-sm text-gray-100 text-nowrap">Air Quality</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            {aqi != null ? `${aqi} (${aqiLabel(aqi)})` : "—"}
          </p>
        </div>

        {/* Wind */}
        <div className="text-center -amber-300 -2">
          <p className="text-xs sm:text-sm text-gray-100">Wind</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            {windRounded != null ? `${windRounded} km/h` : "—"}
          </p>
        </div>

        {/* Humidity */}
          <div className="text-center -amber-300 -2">
          <p className="text-xs sm:text-sm text-gray-100">Humidity</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
           {humidity != null ? `${humidity}%` : "—"}
          </p>
        </div>

        {/* Visibility */}
        <div className="text-center -amber-300 -2">
          <p className="text-xs sm:text-sm text-gray-100">Visibility</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
           {visibility != null ? `${visibility} km` : "—"}
          </p>
        </div>

        {/* Pressure */}
         <div className="text-center -amber-300 -2">
          <p className="text-xs sm:text-sm text-gray-100">Pressure</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1 text-nowrap">
            {pressure != null ? `${pressure} mb` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
