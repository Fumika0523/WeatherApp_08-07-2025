"use client";

import React, { useRef } from "react";
import {  FaCloud, FaCloudRain, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { IoIosSunny, IoIosRainy  } from "react-icons/io";

function getWeatherIcon(code, isDay) {
  if (code === 0) return <IoIosSunny className="text-yellow-500"/>;
  if ([1, 2, 3].includes(code)) return <FaCloud />;
  if ([51, 61, 80].includes(code)) return <IoIosRainy />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake />;
  return <FaCloud />;
}

// Format day number only (no month/year)
function formatDay(dateStr) {
  const d = new Date(dateStr);
  return String(d.getDate()).padStart(2, "0");
}

// Get weekday name (Today / Sat / Sun / Mon)
function getWeekday(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    return "Today";
  }
  return d.toLocaleDateString("en-US", { weekday: "short" }); // Sat, Sun, Mon
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
      {/* Left arrow */}
      <button
        aria-label="Previous days"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
        onClick={() => scrollBy(-7)}
      >
        <FaChevronLeft />
      </button>

      {/* Daily cards */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-hidden scroll-smooth px-10"
      >
        {daily.time.slice(0, 10).map((t, idx) => {
          const maxTemp = daily.temperature_2m_max?.[idx] ?? "—";
          const minTemp = daily.temperature_2m_min?.[idx] ?? "—";
          const code = daily.weathercode?.[idx] ?? 0;
          const isDay = true;

          // Use full date as key to ensure uniqueness
          const fullDateKey = t; // YYYY-MM-DD
          const isSelected = selectedDay === fullDateKey;

          return (
            <button
              key={fullDateKey}
              onClick={() => setSelectedDay(fullDateKey)}
              className={` flex-shrink-0 w-36 rounded-xl p-2 flex flex-col items-center gap-2 transition ${
                isSelected ? "bg-white/30" : "bg-white/5"
              }`}
            >
              {/* Date and weekday */}
              <div className="flex flex-row gap-15 justify-center  text-md">
                <span className="font-bold">{formatDay(t)}</span>
                <span>{getWeekday(t)}</span>
              </div>

              <div className="flex flex-row gap-4 items-center justify-center ">
                {/* Icon */}
                  <div className="text-5xl">{getWeatherIcon(code, isDay)}</div>

                {/* Temperature */}
                <div className="flex flex-col text-white items-center">
                  <span className="font-semibold ">{Math.round(maxTemp)}°</span>
                  <span className="text-gray-300/80">{Math.round(minTemp)}°</span>
                </div>
              </div>

            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        aria-label="Next days"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
        onClick={() => scrollBy(7)}
      >
        <FaChevronRight />
      </button>
    </div>
  );
}
