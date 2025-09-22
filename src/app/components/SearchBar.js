"use client";

import { useState, useEffect } from "react";
import { FaSearch, FaRegStar } from "react-icons/fa";

export default function SearchBar({ setWeatherData, setCoords, setLoading, setError }) {
  const [city, setCity] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Hydration and load favorites
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
      setFavorites(Array.isArray(saved) ? saved : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    localStorage.setItem("favorites", JSON.stringify(newFavs));
  };

  const addFavorite = (cityName) => {
    if (!favorites.includes(cityName)) {
      const updated = [cityName, ...favorites].slice(0, 5); // keep max 5
      saveFavorites(updated);
    }
  };

  const removeFavorite = (cityName) => {
    const updated = favorites.filter((c) => c !== cityName);
    saveFavorites(updated);
  };

  const getWeather = async (cityName) => {
    if (!cityName) return;

    setLoading(true);
    setError("");
    setWeatherData(null);

    try {
      // 1. Geocoding
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError("City not found");
        setLoading(false);
        return;
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // 2. Weather forecast
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max&forecast_days=10&timezone=auto`
      );
      const weatherData = await weatherRes.json();

      // Normalize current weather
      const current = {
        temperature: weatherData.current_weather?.temperature ?? null,
        windspeed: weatherData.current_weather?.windspeed ?? null,
        time: weatherData.current_weather?.time ?? null,
        weathercode:
          weatherData.current_weather?.weathercode ??
          weatherData.hourly?.weathercode?.[0] ??
          0,
      };

      setWeatherData({
        city: name,
        country,
        current,
        hourly: weatherData.hourly,
        daily: weatherData.daily,
      });
      addFavorite(name);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Search input */}
      <div className="flex items-center bg-white/20 rounded-lg p-2 mb-2">
        <input
          type="text"
          placeholder="Search city..."
          className="flex-1 bg-transparent outline-none px-2 text-white placeholder-gray-200"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && getWeather(city)}
        />
        <button
          onClick={() => getWeather(city)}
          className="p-2 hover:scale-110 transition"
        >
          <FaSearch />
        </button>
      </div>

      {/* Favorite cities */}
      {isClient && favorites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {favorites.map((fav) => (
            <div
              key={fav}
              className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition"
            >
              <span onClick={() => getWeather(fav)}>{fav}</span>
              <FaRegStar
                className="text-yellow-400 hover:text-red-400"
                onClick={() => removeFavorite(fav)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
