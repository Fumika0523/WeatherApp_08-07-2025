"use client";

import React, { useRef } from "react";
import { FaSun, FaCloud, FaCloudRain, FaSnowflake, FaChevronLeft, FaChevronRight } from "react-icons/fa";

function getWeatherIcon(code, isDay) {
  if (code === 0) return <FaSun />;
  if ([1, 2, 3].includes(code)) return <FaCloud />;
  if ([51, 61, 80].includes(code)) return <FaCloudRain />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake />;
  return <FaCloud />;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DailyForecast({ daily, selectedDay, setSelectedDay }) {
  const containerRef = useRef(null);

  if (!daily || !daily.time) return null;

  const scrollBy = (direction) => {
    if (!containerRef.current) return;
    const cardWidth = 104; // approx width + gap
    containerRef.current.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };

  return (
    <div className="relative w-full mb-4">
      <button
        aria-label="Previous days"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
        onClick={() => scrollBy(-1)}
      >
        <FaChevronLeft />
      </button>

      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-hidden scroll-smooth px-10"
      >
        {daily.time.slice(0, 10).map((t, idx) => {
          const maxTemp = daily.temperature_2m_max?.[idx] ?? "—";
          const minTemp = daily.temperature_2m_min?.[idx] ?? "—";
          const code = daily.weathercode?.[idx] ?? 0;
          const isDay = true;

          const dayKey = formatDate(t);
          const isSelected = selectedDay === dayKey;

          return (
            <button
              key={dayKey}
              onClick={() => setSelectedDay(dayKey)}
              className={`flex-shrink-0 w-24 rounded-xl p-2 text-center flex flex-col items-center gap-1 transition ${
                isSelected ? "bg-white/30" : "bg-white/5"
              }`}
            >
              <div className="text-xs text-gray-300">{dayKey}</div>
              <div className="text-xl">{getWeatherIcon(code, isDay)}</div>
              <div className="font-semibold text-white">
                {maxTemp}° / {minTemp}°
              </div>
            </button>
          );
        })}
      </div>

      <button
        aria-label="Next days"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
        onClick={() => scrollBy(1)}
      >
        <FaChevronRight />
      </button>
    </div>
  );
}
