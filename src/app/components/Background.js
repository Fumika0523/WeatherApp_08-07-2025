"use client";

import { useEffect, useState } from "react";

export default function Background({ weatherData }) {
  const [bgClass, setBgClass] = useState("bg-gradient-to-br from-sky-400 to-blue-600");

  useEffect(() => {
    if (!weatherData?.current?.weathercode) return;

    const code = weatherData.current.weathercode;

    // Pick background based on weather condition
    if ([0, 1].includes(code)) {
      // Clear / Mostly clear
      setBgClass("bg-gradient-to-br from-yellow-100 to-blue-900");
    } else if ([2, 3].includes(code)) {
      // Cloudy
      setBgClass("bg-gradient-to-br from-gray-400 to-gray-700");
    } else if ([45, 48].includes(code)) {
      // Fog
      setBgClass("bg-gradient-to-br from-gray-500 to-gray-800");
    } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
      // Rain
      setBgClass("bg-gradient-to-br from-blue-500 to-gray-900");
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
      // Snow
      setBgClass("bg-gradient-to-br from-blue-200 to-white");
    } else if ([95, 96, 99].includes(code)) {
      // Thunderstorm
      setBgClass("bg-gradient-to-br from-gray-800 to-black");
    } else {
      // Default (fallback)
      setBgClass("bg-gradient-to-br from-sky-400 to-blue-600");
    }
  }, [weatherData]);

  return (
    <div
          className={`fixed inset-0 h-screen w-screen ${bgClass} -z-10`}

    />
  );
}
