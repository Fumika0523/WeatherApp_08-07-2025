"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { IoIosSunny, IoIosRainy } from "react-icons/io";
import { FaCloud, FaSnowflake,  } from "react-icons/fa";
import { RiLineChartLine } from "react-icons/ri";
import { CiCircleList } from "react-icons/ci";
import { IoMdArrowDropright , IoMdArrowDropleft } from "react-icons/io";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, TimeScale, Tooltip, Filler, Legend);

/* ---------------------- Helpers ---------------------- */
const toHourLabel = (t) => {
  if (typeof window === "undefined") return t; // avoid hydration mismatch
  try {
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t;
  }
};

const closestIndex = (times, now = new Date()) => {
  if (!times?.length) return 0;
  return times.reduce(
    (best, t, i) => (Math.abs(new Date(t) - now) < Math.abs(new Date(times[best]) - now) ? i : best),
    0
  );
};

const getIcon = (code, isDay) => {
  if (code === 0) return <IoIosSunny className="text-yellow-500" />;
  if ([1, 2, 3, 45, 48].includes(code)) return <FaCloud />;
  if ([51, 61, 80].includes(code)) return <IoIosRainy />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake />;
  return <FaCloud />;
};

/* ---------------------- Main Component ---------------------- */
export default function HourlyForecast({ weatherData, selectedDay }) {
  const [viewMode, setViewMode] = useState("Chart");
  const scrollRef = useRef(null);

  const hRaw = weatherData?.hourly || {};
  const daily = weatherData?.daily || {};

  const hourly = useMemo(() => {
    if (!hRaw?.time) return [];
    return hRaw.time.map((time, i) => {
      const dObj = new Date(time);
      const temp = hRaw.temperature_2m?.[i] ?? null;
      const feels = hRaw.apparent_temperature?.[i] ?? temp;
      const precip = hRaw.precipitation?.[i] ?? 0;
      const precipProb = hRaw.precipitation_probability?.[i] ?? null;
      const wind = [hRaw.windspeed_10m, hRaw.windspeed_2m, hRaw.windspeed].map(arr => arr?.[i]).find(Boolean);
      const humidity = hRaw.relativehumidity_2m?.[i] ?? null;
      const code = hRaw.weathercode?.[i] ?? 0;

      let isDay = dObj.getHours() >= 6 && dObj.getHours() < 18;
      if (daily?.time?.length && daily.sunrise && daily.sunset) {
        const dayIndex = daily.time.findIndex(t => new Date(t).toDateString() === dObj.toDateString());
        if (dayIndex >= 0) {
          const sr = new Date(daily.sunrise[dayIndex]).getTime();
          const ss = new Date(daily.sunset[dayIndex]).getTime();
          isDay = dObj.getTime() >= sr && dObj.getTime() <= ss;
        }
      }

      return {
        key: `hour-${time}`,
        time,
        timeMs: dObj.getTime(),
        label: toHourLabel(time),
        temp,
        feels,
        precip,
        precipProb,
        wind: wind != null ? Math.round(wind * 3.6) : null,
        humidity,
        code,
        isDay,
      };
    });
  }, [hRaw, daily]);

  // filter hourly: ONLY include hours that belong to the selected date (or today if none selected)
  const filteredHourly = useMemo(() => {
    if (!hourly.length) return [];

    const isSameDate = (timeStr, dateObj) => {
      const d = new Date(timeStr);
      return d.getFullYear() === dateObj.getFullYear() &&
             d.getMonth() === dateObj.getMonth() &&
             d.getDate() === dateObj.getDate();
    };

    // if no selectedDay, treat as "today" and show only today's hours (00:00 - 23:00)
    if (!selectedDay) {
      const today = new Date();
      return hourly.filter(h => isSameDate(h.time, today));
    }

    // numeric day like "10"
    if (/^\d{1,2}$/.test(selectedDay)) {
      const dayNum = Number(selectedDay);
      // keep items that have same day-of-month (month/year will match the data)
      return hourly.filter(h => new Date(h.time).getDate() === dayNum);
    }

    // full date string
    const sel = new Date(selectedDay);
    if (isNaN(sel)) return hourly;
    return hourly.filter(h => isSameDate(h.time, sel));
  }, [hourly, selectedDay]);

  // is selected day equal to today (or none selected)
  const isSelectedToday = useMemo(() => {
    if (!filteredHourly.length) return false;
    if (!selectedDay) return true;
    if (/^\d{1,2}$/.test(selectedDay)) {
      return Number(selectedDay) === new Date().getDate();
    }
    const sel = new Date(selectedDay);
    return !isNaN(sel) && sel.toDateString() === new Date().toDateString();
  }, [selectedDay, filteredHourly]);

  // exact Now index only when an exact same hour exists in filteredHourly
  const exactNowIndex = useMemo(() => {
    if (!filteredHourly.length) return -1;
    const now = new Date();
    return filteredHourly.findIndex(h => {
      const d = new Date(h.time);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        d.getHours() === now.getHours()
      );
    });
  }, [filteredHourly]);

  const [currentIdx, setCurrentIdx] = useState(0);

  // set currentIdx when data changes: use exact Now if present & today, otherwise start at 0
  useEffect(() => {
    if (!filteredHourly.length) return;
    if (isSelectedToday && exactNowIndex >= 0) {
      setCurrentIdx(exactNowIndex);
    } else {
      setCurrentIdx(0);
    }
  }, [filteredHourly, isSelectedToday, exactNowIndex]);

  // helper to scroll to a specific index (uses offsetLeft)
const scrollToIndex = (index, smooth = true) => {
  if (!scrollRef.current) return;
  const container = scrollRef.current;
  const children = container.children;
  if (!children || index < 0 || index >= children.length) return;
  const card = children[index];
  const left = card.offsetLeft;
  try {
    container.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  } catch {
    container.scrollLeft = left;
  }
};

// improved scrollBy with left-wrap-to-NOW behavior
const scrollBy = (direction) => {
  if (!scrollRef.current) return;
  const container = scrollRef.current;
  const cardWidth = 128; // tweak if your card width/gap changes
  const maxScrollLeft = Math.max(0, container.scrollWidth - container.offsetWidth);
  const atStart = container.scrollLeft <= 2;
  const atEnd = container.scrollLeft >= maxScrollLeft - 2;

  // RIGHT arrow: if at end -> wrap to Now (if available) or to start
  if (direction > 0 && atEnd) {
    if (isSelectedToday && exactNowIndex >= 0) {
      setCurrentIdx(exactNowIndex); // highlight Now
      scrollToIndex(exactNowIndex);
    } else {
      // no Now available, jump to start
      try {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } catch {
        container.scrollLeft = 0;
      }
      setCurrentIdx(0);
    }
    return;
  }

  // LEFT arrow: if at start -> go to Now (if available)
  if (direction < 0 && atStart) {
    if (isSelectedToday && exactNowIndex >= 0) {
      setCurrentIdx(exactNowIndex);
      scrollToIndex(exactNowIndex);
    } else {
      // optional: wrap to end if you prefer; here we just stay at start
      // to wrap to end uncomment below:
      // try { container.scrollTo({ left: maxScrollLeft, behavior: "smooth" }); } catch { container.scrollLeft = maxScrollLeft; }
      setCurrentIdx(0);
    }
    return;
  }

  // Normal card-by-card scroll
  try {
    container.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  } catch {
    container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft + direction * cardWidth));
  }
};


  const accent = "#facc15";
  const limited = filteredHourly.slice(0, 24);

  const data = {
    labels: limited.map(h => h.timeMs),
    datasets: [
      {
        label: "Temp",
        data: filteredHourly.map(h => h.temp),
        fill: true,
        borderColor: accent,
        backgroundColor: "rgba(250, 204, 21, 0.2)",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: accent,
      },
      {
        label: "Feels like",
        data: filteredHourly.map(h => h.feels),
        borderColor: "#f97316",
        borderDash: [4, 6],
        tension: 0.4,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        type: "time",
        ticks: {
          color: "white",
          font: { size: 11 },
          callback: function (val, idx) {
            const showNow = isSelectedToday && exactNowIndex >= 0 && idx === currentIdx;
            return showNow ? "Now" : toHourLabel(this.getLabelForValue(val));
          },
        },
      },
      y: { ticks: { color: "white", font: { size: 11 } } },
    },
  };

  // Scroll-to-"Now" when switching to List view (only if exactNowIndex exists and selected day is today).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!scrollRef.current || !filteredHourly.length) return;

    // only act when user switched to List
    if (viewMode !== "List") return;

    if (!(isSelectedToday && exactNowIndex >= 0)) {
      // ensure scrolled to start for non-today or if no exact Now
      scrollRef.current.scrollLeft = 0;
      return;
    }

    // perform reliable scroll after DOM paint (two rAFs) and fallback
    let raf1 = null;
    let raf2 = null;
    let fallbackTimer = null;

    const scrollToNow = () => {
      if (!scrollRef.current) return;
      const children = scrollRef.current.children;
      if (!children || children.length === 0 || currentIdx >= children.length) return;
      const card = children[currentIdx];
      if (!card) return;
      const left = card.offsetLeft;

      try {
        scrollRef.current.scrollTo({ left, behavior: "smooth" });
      } catch {
        scrollRef.current.scrollLeft = left;
      }

      fallbackTimer = setTimeout(() => {
        if (!scrollRef.current) return;
        if (Math.abs(scrollRef.current.scrollLeft - left) > 2) {
          scrollRef.current.scrollLeft = left;
        }
      }, 250);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(scrollToNow);
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [viewMode, currentIdx, filteredHourly, isSelectedToday, exactNowIndex]);

  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-4 mt-6 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Hourly</h3>
        <div className="bg-white/10 rounded-full flex text-sm">
          <button
            onClick={() => setViewMode("Chart")}
            className={`px-4 py-2 rounded-full flex gap-1 justify-center items-center ${
              viewMode === "Chart" ? "bg-white/30" : "text-gray-200"
            }`}
          >
            <RiLineChartLine className="text-[20px]" /> <span className="sm:hidden md:block">Chart</span>
          </button>
          <button
            onClick={() => setViewMode("List")}
            className={`px-4 py-2 rounded-full flex gap-1 justify-center items-center ${
              viewMode === "List" ? "bg-white/30" : "text-gray-200"
            }`}
          >
            <CiCircleList className="text-[20px]" /> <span className="md:block sm:hidden">List</span>
          </button>
        </div>
      </div>

      {!filteredHourly.length && <div className="text-center text-gray-300">No hourly data for selected day</div>}

      {filteredHourly.length > 0 && viewMode === "Chart" && (
        <div className="w-full h-64 mb-4 relative">
          <Line data={data} options={options} />
        </div>
      )}

      {filteredHourly.length > 0 && viewMode === "List" && (
        <div className="relative">
         {/* Left arrow */}
        <button
          aria-label="Previous hours"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black h-[40px] rounded-sm
          transform transition-transform duration-200 ease-out
          hover:scale-120 active:scale-115 focus:outline-none focus:ring-2 focus:ring-white/30
          flex items-center justify-center"
          onClick={() => scrollBy(-4)}
        >
          <IoMdArrowDropleft className="text-2xl" />
        </button>

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-hidden scroll-smooth py-2"
          >
            {filteredHourly.map((h, i) => {
              const showNow = isSelectedToday && exactNowIndex >= 0 && i === currentIdx;
              return (
                <div
                  key={h.key}
                  className={`flex-shrink-0 space-y-3 w-32 flex flex-col min-h-[170px] items-start justify-start py-3 px-2 rounded-xl transition ${
                    showNow ? "bg-white/30 ring-2 ring-white/20" : "bg-white/6"
                  }`}
                >
                  <div className="text-[17px] text-gray-100">
                    {showNow ? "Now" : h.label}
                  </div>
                  <div className="text-6xl">{getIcon(h.code, h.isDay)}</div>
                  <div className="font-semibold text-[17px]">{h.temp != null ? Math.round(h.temp) : "—"}°</div>
                  <div className="text-sm text-gray-200">
                    Feels like {h.feels != null ? Math.round(h.feels) : "—"}°
                  </div>
                </div>
              );
            })}
          </div>
         <button
          aria-label="Next hours"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black h-[40px] rounded-sm
          transform transition-transform duration-200 ease-out
          hover:scale-120 active:scale-115 focus:outline-none focus:ring-2 focus:ring-white/30
          flex items-center justify-center"
          onClick={() => scrollBy(4)}
        >
          <IoMdArrowDropright className="text-2xl" />
        </button>

        </div>
      )}
    </section>
  );
}
