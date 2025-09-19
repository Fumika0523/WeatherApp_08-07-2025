// /components/CurrentWeather.js
"use client";

import { FaWind, FaTint, FaEye, FaTachometerAlt } from "react-icons/fa";

export default function CurrentWeather({ weatherData }) {
  const { current, daily } = weatherData;

  const now = new Date();
  const currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Weather description mapping based on weathercode
  const getDescription = (code) => {
    switch (code) {
      case 0: return "Clear";
      case 1: return "Mainly clear";
      case 2: return "Partly cloudy";
      case 3: return "Overcast";
      case 45:
      case 48: return "Fog";
      case 51:
      case 61:
      case 80: return "Rain";
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86: return "Snow";
      default: return "Cloudy";
    }
  };

  return (
    <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 text-white space-y-4">
      {/* City & Time */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{weatherData.city}, {weatherData.country}</h2>
        <p>{currentTime}</p>
      </div>

      {/* Weather main */}
      <div className="flex flex-col items-center space-y-2">
        <p className="text-lg">{getDescription(current.weathercode)}</p>
        <p className="text-5xl font-bold">{current.temperature}°C</p>
        <p className="text-lg">{getDescription(current.weathercode)}</p>
        <p className="text-sm text-gray-200">
          Feels like: {current.temperature - 5}° {/* Placeholder for feels like */}
        </p>
        <p className="text-sm text-gray-200">
          The skies will be partly cloudy. The low will be {daily.temperature_2m_min[0]}°.
        </p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
        <div className="bg-white/10 p-3 rounded-xl text-center">
          <p className="text-sm">Wind</p>
          <p className="font-bold flex items-center justify-center gap-1">
            <FaWind /> {current.windspeed} km/h
          </p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl text-center">
          <p className="text-sm">Humidity</p>
          <p className="font-bold flex items-center justify-center gap-1">
            <FaTint /> 88% {/* Placeholder */}
          </p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl text-center">
          <p className="text-sm">Visibility</p>
          <p className="font-bold flex items-center justify-center gap-1">
            <FaEye /> 10 km {/* Placeholder */}
          </p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl text-center">
          <p className="text-sm">Pressure</p>
          <p className="font-bold flex items-center justify-center gap-1">
            <FaTachometerAlt /> 1019 mb {/* Placeholder */}
          </p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl text-center">
          <p className="text-sm">Dew Point</p>
          <p className="font-bold flex items-center justify-center gap-1">
            16° {/* Placeholder */}
          </p>
        </div>
      </div>
    </div>
  );
}
