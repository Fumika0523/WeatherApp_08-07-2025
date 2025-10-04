"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { IoIosSunny, IoIosRainy } from "react-icons/io";
import { FaCloud, FaSnowflake } from "react-icons/fa";
import { RiLineChartLine } from "react-icons/ri";
import { CiCircleList } from "react-icons/ci";
import { IoMdArrowDropright, IoMdArrowDropleft } from "react-icons/io";

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
  if (!t) return "";
  let d;

  if (t instanceof Date) {
    d = t;
  } else if (typeof t === "number") {
    d = new Date(t);
  } else if (typeof t === "string") {
    d = new Date(t);
  } else {
    return "";
  }

  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

const CustomTooltip = (ctx, hourly) => {
  const idx = ctx.tooltip?.dataPoints?.[0]?.dataIndex;
  if (idx == null) return null;
  const d = hourly[idx];

  return `<div style="min-width:150px;background:rgba(6,8,20,0.9);padding:12px;border-radius:10px;color:white;box-shadow:0 6px 18px rgba(0,0,0,0.45)">
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:6px">${toHourLabel(d.timeMs)}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
        <div style="font-size:35px">${getIcon(d.code, d.isDay).props.children ?? ""}</div>
        <div>
          <div style="font-weight:700;font-size:16px">${Math.round(d.temp ?? 0)}°</div>
          <div style="font-size:12px;color:#cbd5e1">Feels like: ${Math.round(d.feels ?? d.temp ?? 0)}°</div>
        </div>
      </div>
      <div style="font-size:12px;color:#cbd5e1">
        <div>Precip: ${d.precipDisplay ?? 0}${d.precipIsProb ? "%" : " mm"}</div>
        <div>Wind: ${d.wind ?? "—"} km/h</div>
        <div>Humidity: ${d.humidity ?? "—"}%</div>
      </div>
    </div>`;
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

  const filteredHourly = useMemo(() => {
    if (!hourly.length) return [];
    const isSameDate = (timeStr, dateObj) => {
      const d = new Date(timeStr);
      return d.getFullYear() === dateObj.getFullYear() &&
             d.getMonth() === dateObj.getMonth() &&
             d.getDate() === dateObj.getDate();
    };
    if (!selectedDay) {
      const today = new Date();
      return hourly.filter(h => isSameDate(h.time, today));
    }
    if (/^\d{1,2}$/.test(selectedDay)) {
      const dayNum = Number(selectedDay);
      return hourly.filter(h => new Date(h.time).getDate() === dayNum);
    }
    const sel = new Date(selectedDay);
    if (isNaN(sel)) return hourly;
    return hourly.filter(h => isSameDate(h.time, sel));
  }, [hourly, selectedDay]);

  const isSelectedToday = useMemo(() => {
    if (!filteredHourly.length) return false;
    if (!selectedDay) return true;
    if (/^\d{1,2}$/.test(selectedDay)) {
      return Number(selectedDay) === new Date().getDate();
    }
    const sel = new Date(selectedDay);
    return !isNaN(sel) && sel.toDateString() === new Date().toDateString();
  }, [selectedDay, filteredHourly]);

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
  const [firstIdx, setFirstIdx] = useState(0);
  const [showNowLabel, setShowNowLabel] = useState(true);

  // initial currentIdx
  useEffect(() => {
    if (!filteredHourly.length) return;
    if (isSelectedToday && exactNowIndex >= 0) {
      setCurrentIdx(exactNowIndex);
    } else {
      setCurrentIdx(0);
    }
  }, [filteredHourly, isSelectedToday, exactNowIndex]);

  const scrollToIndex = (index, smooth = true) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.children[index];
    if (!card) return;
    const left = card.offsetLeft;
    try {
      container.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    } catch {
      container.scrollLeft = left;
    }
  };

  const scrollBy = (direction) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardWidth = 128;
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.offsetWidth);
    const atStart = container.scrollLeft <= 2;
    const atEnd = container.scrollLeft >= maxScrollLeft - 2;

    if (direction > 0 && atEnd) {
      if (isSelectedToday && exactNowIndex >= 0) {
        setCurrentIdx(exactNowIndex);
        scrollToIndex(exactNowIndex);
      } else {
        container.scrollTo({ left: 0, behavior: "smooth" });
        setCurrentIdx(0);
      }
      return;
    }
    if (direction < 0 && atStart) {
      if (isSelectedToday && exactNowIndex >= 0) {
        setCurrentIdx(exactNowIndex);
        scrollToIndex(exactNowIndex);
      } else {
        setCurrentIdx(0);
      }
      return;
    }
    try {
      container.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
    } catch {
      container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft + direction * cardWidth));
    }
  };

  const accent = "#facc15";
const limitedHourly = filteredHourly.slice(0, 24);

const data = {
  labels: limitedHourly.map(h => h.timeMs), // timestamps in ms
  datasets: [
    {
      label: "Temp",
      data: limitedHourly.map(h => h.temp),
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
      data: limitedHourly.map(h => h.feels),
      borderColor: "#f97316",
      borderDash: [4, 6],
      tension: 0.4,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 6,
    },
  ],
};
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (ctx) => {
          const tooltipEl = document.getElementById("chartjs-tooltip");
          if (!tooltipEl) return;
          const { chart, tooltip } = ctx;
          if (tooltip.opacity === 0) {
            tooltipEl.style.opacity = 0;
            return;
          }
          tooltipEl.style.opacity = 1;
          tooltipEl.style.position = "absolute";
          tooltipEl.style.left = chart.canvas.offsetLeft + tooltip.caretX + "px";
          tooltipEl.style.top = chart.canvas.offsetTop + tooltip.caretY + "px";
          tooltipEl.innerHTML = CustomTooltip(ctx, filteredHourly);
        },
      },
    },
   scales: {
x: {
  type: "time",
  time: {
    unit: "hour",
    tooltipFormat: "HH:mm",
    displayFormats: { hour: "HH:mm" },
  },
  ticks: {
    color: "white",
    font: { size: 11 },
    callback: function (val, idx, ticks) {
      const d = new Date(val);
      if (isNaN(d)) return "";
      // Show "Now" at current index
      if (idx === currentIdx && showNowLabel) return "Now";
      // Only show label every 3 hours
      const hour = d.getHours();
      if (hour % 2 === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return ""; // skip other hours
    },
  },
},

  y: { ticks: { color: "white", font: { size: 11 } } },
},

  };

  // scroll to Now when switching to List view
  useEffect(() => {
    if (!scrollRef.current || !filteredHourly.length) return;
    if (viewMode !== "List") return;

    let idx = 0;
    if (isSelectedToday && exactNowIndex >= 0) {
      idx = exactNowIndex;
      setCurrentIdx(exactNowIndex);
    }

    const scrollNow = () => {
      if (!scrollRef.current) return;
      const card = scrollRef.current.children[idx];
      if (!card) return;
      const left = card.offsetLeft;
      try {
        scrollRef.current.scrollTo({ left, behavior: "smooth" });
      } catch {
        scrollRef.current.scrollLeft = left;
      }
    };

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(scrollNow);
    });

    return () => cancelAnimationFrame(raf1);
  }, [viewMode, filteredHourly, isSelectedToday, exactNowIndex]);


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
          <div id="chartjs-tooltip" className="absolute top-0 left-0 pointer-events-none"></div>
        </div>
      )}

      {filteredHourly.length > 0 && viewMode === "List" && (
        <div className="relative">
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

          <div ref={scrollRef} className="flex gap-5 overflow-x-hidden scroll-smooth py-2">
            {filteredHourly.map((h, i) => {
              const showNow = isSelectedToday && exactNowIndex >= 0 && i === currentIdx;
              return (
                <div
                  key={h.key}
                  className={`flex-shrink-0 space-y-3 w-32 flex flex-col min-h-[170px] items-start justify-start py-3 px-2 rounded-xl transition ${
                    showNow ? "bg-white/30 ring-2 ring-white/20" : "bg-white/6 hover:bg-white/10"
                  }`}
                >
                  <div className="text-[17px] text-gray-100">{showNow ? "Now" : h.label}</div>
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
