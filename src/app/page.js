"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Components
import SearchBar from "./components/SearchBar";
import CurrentWeather from "./components/CurrentWeather";
import HourlyForecast from "./components/HourlyForecast";
import DailyForecast from "./components/DailyForecast";
import WeatherDetails from "./components/WeatherDetails";
import SunInfo from "./components/SunInfo";
import LoadingBar from "./components/LoadingBar";

// Client-only components
const Background = dynamic(() => import("./components/Background"), { ssr: false });

export default function HomePage() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null); // null = show all hours

  // Derived hourly data for the selected day
  const displayedHourly = useMemo(() => {
    if (!weatherData?.hourly?.time) return [];

    const { hourly: hRaw } = weatherData;
    const count = hRaw.time.length;

    const allHours = [];
    for (let i = 0; i < count; i++) {
      allHours.push({
        time: hRaw.time[i],
        temperature: hRaw.temperature_2m?.[i] ?? null,
        feels: hRaw.apparent_temperature?.[i] ?? null,
        weathercode: hRaw.weathercode?.[i] ?? 0,
        precipitation: hRaw.precipitation?.[i] ?? 0,
        wind: hRaw.windspeed_10m?.[i] ?? null,
        humidity: hRaw.relativehumidity_2m?.[i] ?? null,
      });
    }

    if (!selectedDay) return allHours;

    const selected = new Date(selectedDay);
    return allHours.filter((h) => {
      const d = new Date(h.time);
      return (
        d.getFullYear() === selected.getFullYear() &&
        d.getMonth() === selected.getMonth() &&
        d.getDate() === selected.getDate()
      );
    });
  }, [weatherData, selectedDay]);

// console.log("Daily forecast days:", weatherData?.daily?.time?.length);
console.log("Full weatherData:", weatherData);

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <Background weatherData={weatherData} />

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-start p-4 space-y-6">
        {/* Search Bar */}
        <SearchBar
          setWeatherData={setWeatherData}
          setLoading={setLoading}
          setError={setError}
        />

        {/* Loading / Error */}
        {loading && 
        <>
          <p className="text-white text-center">Loading...</p>
         <LoadingBar/>
        </>
  
  
        }
        {error && <p className="text-red-400 text-center">{error}</p>}

        {/* Weather sections */}
        {weatherData ? (
          <div className="w-full max-w-4xl space-y-6">
            {/* Row: CurrentWeather  */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start justify-center">
        {/* Current Weather - takes 8/12 on md and up */}
        <div className="md:col-span-8">
          <CurrentWeather weatherData={weatherData} />
        </div>

        {/* Sun Info - takes 4/12 on md and up */}
        <div className="md:col-span-4">
          <SunInfo daily={weatherData?.daily} />
        </div>
      </div>

            {/* Daily Forecast */}
            <DailyForecast
              daily={weatherData.daily}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
            />

            {/* Hourly Forecast */}
            <HourlyForecast
              weatherData={weatherData}
              selectedDay={selectedDay}
              displayedHourly={displayedHourly} // pass filtered data
            />

            {/* Detailed Weather Info */}
            <WeatherDetails weatherData={weatherData} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
