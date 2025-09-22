// /src/app/components/CurrentWeather.js
"use client";

import {
  FaWind,
  FaTint,
  FaEye,
  FaTachometerAlt,
  FaSmog,
  FaSun,
  FaCloud,
  FaCloudRain,
  FaSnowflake,
} from "react-icons/fa";

export default function CurrentWeather({ weatherData }) {
  if (!weatherData) return null;

  const { current = {}, hourly = {}, daily = {}, air_quality = {} } = weatherData;

  const safeNum = (v) =>
    v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v));

  // Try to find "feels like" from either current or hourly (fallback)
  let feelsLike = current.apparent_temperature ?? null;
  try {
    if (feelsLike == null && hourly?.time && hourly?.apparent_temperature && current?.time) {
      const idx = hourly.time.findIndex((t) => t === current.time);
      if (idx >= 0) feelsLike = hourly.apparent_temperature?.[idx];
    }
  } catch {}
  if (feelsLike == null) feelsLike = current.temperature;

  // Description mapping
  const getDescription = (code) => {
    switch (code) {
      case 0:
        return "Clear";
      case 1:
        return "Mainly clear";
      case 2:
        return "Partly cloudy";
      case 3:
        return "Overcast";
      case 45:
      case 48:
        return "Fog";
      case 51:
      case 53:
      case 55:
      case 61:
      case 63:
      case 65:
      case 80:
      case 81:
      case 82:
        return "Rain";
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return "Snow";
      case 95:
      case 96:
      case 99:
        return "Thunderstorm";
      default:
        return "Cloudy";
    }
  };

  const getWeatherIcon = (code, isDay = true) => {
    if (code === 0) return <FaSun size={80} />;
    if ([1, 2, 3].includes(code)) return <FaCloud size={80}/>;
    if ([45, 48].includes(code)) return <FaCloud size={80} />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <FaCloudRain size={80}/>;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake size={80} />;
    return <FaCloud  size={80} />;
  };

  // Determine day/night (best-effort)
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

  // Air quality: try multiple places (open-meteo uses air_quality.us_aqi or hourly.us_aqi)
const aqi =
  air_quality?.us_aqi ??
  air_quality?.european_aqi ??
  hourly?.us_aqi?.[0] ??
  hourly?.european_aqi?.[0] ??
  null;

  const aqiLabel = (n) => {
    if (n == null) return "—";
    if (n <= 50) return "Good";
    if (n <= 100) return "Moderate";
    if (n <= 150) return "Unhealthy";
    if (n <= 200) return "Very unhealthy";
    return "Hazardous";
  };

  // Humidity from hourly[0] or current (fallback)
const humidity = safeNum(
  hourly?.relativehumidity_2m?.[0] ?? current?.relativehumidity_2m
);

  // Visibility & Pressure may not be provided by API; fallback to placeholders
const visibility = current?.visibility != null
  ? Math.round(current.visibility / 1000)
  : null;// km if provided
  const pressure = current?.surface_pressure ?? null; // mb if provided

  // Time string
  const now = current?.time ? new Date(current.time) : new Date();
  const currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // Build a natural language description like MSN Weather
  const buildLongDescription = () => {
    const code = current?.weathercode ?? 0;
    const short = getDescription(code).toLowerCase();

    // humidity adjective
    let humAdj = "";
    if (typeof humidity === "number") {
      if (humidity >= 75) humAdj = "humid";
      else if (humidity >= 50) humAdj = "mildly humid";
      else humAdj = "dry";
    }

    // temperature phrase
    const highToday = safeNum(daily?.temperature_2m_max?.[0]);
    const tempPhrase = highToday != null ? `The high will be ${highToday}°` : "";

    // build intro
    let intro = "";
    if (code === 0) intro = "Expect sunny skies.";
    else intro = `Expect ${short}.`;

    // combine
    if (tempPhrase) {
      return `${intro} ${tempPhrase}${humAdj ? ` on this ${humAdj} day.` : "."}`;
    }
    return intro;
  };

  const longDescription = buildLongDescription();


  return (
    <div className="rounded-2xl p-5 sm:p-6 text-white bg-white/5">
      {/* Header: city & time */}
      <div className="flex items-start justify-between  gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold truncate">
            {weatherData.city ?? "—"}
            {weatherData.country ? `, ${weatherData.country}` : ""}
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 mt-1">{currentTime}</p>
        </div>
      </div>

      {/* Main weather block: icon + temp */}
      <div className="flex flex-col  border-sky-500 sm:flex-row items-start gap-4 my-3">
          <div className="inline-block">{getWeatherIcon(current?.weathercode ?? 0, isDay)}</div>

          <div className="flex flex-row items-center gap-7 border-amber-300">
            {/* Left */}
            <div className="items-center justify-start  flex flex-col">
              {/* Temperature */}
              <p className="text-6xl font-medium leading-tight">
              {tempRounded != null ? `${tempRounded}°C` : "—"}
              </p>
              {/* Low */}
              {/* <p className="text-md text-gray-200 mt-1">
              {daily?.temperature_2m_min ? `Low: ${lowToday ?? "—"}°` : ""}
              </p> */}
            </div>
            {/* Right */}
            <div className="flex flex-col items-start justify-start">         
             <p className="text-[20px] text-gray-200 font-bold">{description}</p>
            <p className="text-xs sm:text-sm text-gray-200 mt-1">
              Feels like {feelsRounded != null ? `${feelsRounded}°` : "—"}
            </p>
           </div>
          </div>
       
      </div>
      
     <div className="text-[15px]">{longDescription}</div>

      {/* Details grid — Air quality, Wind, Humidity, Visibility, Pressure */}
     <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-5  md:gap-10 mt-4">
        {/* Air quality */}
        <div className="p-2 sm:p-3 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-200">Air quality</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            <FaSmog className="text-sm sm:text-base" />
            {aqi != null ? `${aqi} (${aqiLabel(aqi)})` : "—"}
          </p>
        </div>

        {/* Wind */}
        <div className="p-2 sm:p-3 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-200">Wind</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            <FaWind className="text-sm sm:text-base" /> {windRounded != null ? `${windRounded} km/h` : "—"}
          </p>
        </div>

        {/* Humidity */}
        <div className="p-2 sm:p-3 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-200">Humidity</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            <FaTint className="text-sm sm:text-base" /> {humidity != null ? `${humidity}%` : "—"}
          </p>
        </div>

        {/* Visibility */}
        <div className="p-2 sm:p-3 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-200">Visibility</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            <FaEye className="text-sm sm:text-base" /> {visibility != null ? `${visibility} km` : "—"}
          </p>
        </div>

        {/* Pressure */}
        <div className="p-2 sm:p-3 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-gray-200">Pressure</p>
          <p className="font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-1">
            <FaTachometerAlt className="text-sm sm:text-base" /> {pressure != null ? `${pressure} mb` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}


