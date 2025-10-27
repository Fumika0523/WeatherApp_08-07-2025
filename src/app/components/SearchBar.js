// /components/SearchBar.js
"use client";

import { useState, useEffect } from "react";
import { FaSearch, FaStar } from "react-icons/fa";
import SunCalc from "suncalc"; // npm i suncalc

export default function SearchBar({ setWeatherData, setLoading, setError, setCoords }) {
  const [city, setCity] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [isClient, setIsClient] = useState(false);

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
      const updated = [cityName, ...favorites].slice(0, 5);
      saveFavorites(updated);
    }
  };

  const removeFavorite = (cityName) => {
    const updated = favorites.filter((c) => c !== cityName);
    saveFavorites(updated);
  };

  // Fetch forecast with fallback for extra fields
  async function fetchForecastWithFallback(latitude, longitude) {
    const baseParams = {
      latitude: String(latitude),
      longitude: String(longitude),
      current_weather: "true",
      forecast_days: "10",
      timezone: "auto",
    };

    const safeHourly = [
      "temperature_2m",
      "apparent_temperature",
      "weathercode",
      "windspeed_10m",
      "precipitation",
      "relativehumidity_2m",
      "uv_index",
    ].join(",");

    const extraHourly = ["visibility", "surface_pressure"].join(",");

    const dailyVars = [
      "temperature_2m_max",
      "temperature_2m_min",
      "weathercode",
      "sunrise",
      "sunset",
      "uv_index_max",
    ].join(",");

    const buildUrl = (hourlyVars) => {
      const params = new URLSearchParams({
        ...baseParams,
      });
      params.append("hourly", hourlyVars);
  
      params.append("daily", dailyVars);
      return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    };

    const withExtras = `${safeHourly},${extraHourly}`;
    const url1 = buildUrl(withExtras);

    let res1 = await fetch(url1);
    if (res1.ok) return await res1.json();

    if (res1.status === 400) {
      const url2 = buildUrl(safeHourly);
      const res2 = await fetch(url2);
      if (!res2.ok) throw new Error(`Forecast retry failed ${res2.status}`);
      return await res2.json();
    }

    throw new Error(`Forecast fetch failed ${res1.status}`);
  }

  const getWeather = async (cityName) => {
    if (!cityName) return;

    setLoading(true);
    setError("");
    setWeatherData(null);

    try {
      // 1) Geocoding
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=1`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData?.results?.length) {
        setError("City not found");
        setLoading(false);
        return;
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      if (typeof setCoords === "function") setCoords({ latitude, longitude });

      // 2) Forecast
      const forecastData = await fetchForecastWithFallback(latitude, longitude);

      // 3) Air quality (fixed)
      let airQualityHourly = null;
      try {
        const aqHourlyVars = [
          "us_aqi",
          "european_aqi",
          "pm10",
          "pm2_5",
          "carbon_monoxide",
          "nitrogen_dioxide",
          "sulphur_dioxide",
          "ozone",
        ].join(",");

        const aqParams = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          timezone: "auto",
          hourly: aqHourlyVars,
        });

        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams.toString()}`;
        const aqRes = await fetch(aqUrl);
        if (aqRes.ok) {
          const aqData = await aqRes.json();
          airQualityHourly = aqData.hourly || null;
        } else {
          console.warn("Air quality fetch failed", aqRes.status);
        }
      } catch (err) {
        console.warn("Air quality fetch error:", err);
      }

      // 4) Compute moon data
      const dailyRaw = forecastData.daily || {};
      const daily = { ...dailyRaw };
      try {
        const timeArr = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
        const moonriseArr = [];
        const moonsetArr = [];
        const moonphaseArr = [];
        for (let i = 0; i < timeArr.length; i++) {
          const dt = new Date(timeArr[i]);
          const mt = SunCalc.getMoonTimes(dt, latitude, longitude);
          moonriseArr.push(mt.rise ? mt.rise.toISOString() : null);
          moonsetArr.push(mt.set ? mt.set.toISOString() : null);
          moonphaseArr.push(SunCalc.getMoonIllumination(dt).phase);
        }
        daily.moonrise = moonriseArr;
        daily.moonset = moonsetArr;
        daily.moonphase = moonphaseArr;
      } catch {
        daily.moonrise = dailyRaw.moonrise || ["20:10"];
        daily.moonset = dailyRaw.moonset || ["06:45"];
        daily.moonphase = dailyRaw.moonphase || [0.5];
      }

      // 5) Normalize current
      const current = {
        temperature: forecastData.current_weather?.temperature ?? null,
        time: forecastData.current_weather?.time ?? null,
        weathercode:
          forecastData.current_weather?.weathercode ??
          (forecastData.hourly?.weathercode?.[0] ?? 0),
        windspeed:
          forecastData.current_weather?.windspeed ??
          (forecastData.hourly?.windspeed_10m?.[0] ?? null),
        winddirection: forecastData.current_weather?.winddirection ?? null,
        windgust: forecastData.current_weather?.windgust ?? null,
        apparent_temperature: forecastData.hourly?.apparent_temperature?.[0] ?? null,
        relativehumidity: forecastData.hourly?.relativehumidity_2m?.[0] ?? null,
        uv_index: (daily?.uv_index_max?.[0]) ?? (forecastData.hourly?.uv_index?.[0] ?? null),
        visibility: forecastData.hourly?.visibility?.[0] ?? null,
        pressure: forecastData.hourly?.surface_pressure?.[0] ?? null,
      };

      // 6) Merge AQ hourly into hourly
      const mergedHourly = { ...(forecastData.hourly || {}) };
      if (airQualityHourly) {
        if (Array.isArray(airQualityHourly.us_aqi)) mergedHourly.us_aqi = airQualityHourly.us_aqi;
        if (Array.isArray(airQualityHourly.european_aqi)) mergedHourly.european_aqi = airQualityHourly.european_aqi;
      }

      const topAqi =
        airQualityHourly?.us_aqi?.[0] ??
        airQualityHourly?.european_aqi?.[0] ??
        null;

      // 7) Set final weatherData
      setWeatherData({
        city: name,
        country,
        current,
        hourly: mergedHourly,
        daily,
        aqi: topAqi,
        air_quality: airQualityHourly ?? {},
        raw: { forecastData, airQualityHourly },
      });

      addFavorite(name);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message || "Failed to fetch weather data");
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
              <FaStar 
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
