// /components/Favorites.js
"use client";

import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function Favorites({ setWeatherData, setCoords }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
    setFavorites(saved);
  }, []);

  const loadCity = (city) => {
    setWeatherData(city.weatherData);
  };

  const removeCity = (index) => {
    const updated = [...favorites];
    updated.splice(index, 1);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const addFavorite = (cityName, weatherData, coords) => {
    const newFavorite = { cityName, weatherData, coords };
    const updated = [...favorites, newFavorite];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  return (
    <div className="flex gap-2 overflow-x-auto w-full max-w-2xl p-2">
      {favorites.map((fav, i) => (
        <div
          key={i}
          className="flex items-center bg-white/20 backdrop-blur-lg rounded-xl px-3 py-2 min-w-[100px] justify-between"
        >
          <button
            onClick={() => loadCity(fav)}
            className="text-white font-semibold"
          >
            {fav.cityName}
          </button>
          <button onClick={() => removeCity(i)} className="ml-2 text-red-400">
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}
