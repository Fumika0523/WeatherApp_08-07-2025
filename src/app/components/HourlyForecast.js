"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { IoIosSunny, IoIosRainy } from "react-icons/io";
import { FaCloud, FaSnowflake, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { RiLineChartLine } from "react-icons/ri";
import { CiCircleList } from "react-icons/ci";

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
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

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
        precipDisplay: precip > 0 ? precip : precipProb ?? 0,
        precipIsProb: !(precip > 0) && precipProb != null,
      };
    });
  }, [hRaw, daily]);

  const filteredHourly = useMemo(() => {
    if (!hourly.length) return [];
    if (!selectedDay) return hourly;
    if (/^\d{1,2}$/.test(selectedDay)) {
      const dayNum = Number(selectedDay);
      return hourly.filter(h => new Date(h.time).getDate() === dayNum);
    }
    const sel = new Date(selectedDay);
    return isNaN(sel) ? hourly : hourly.filter(h => new Date(h.time).toDateString() === sel.toDateString());
  }, [hourly, selectedDay]);

  const currentIdx = useMemo(() => closestIndex(filteredHourly.map(h => h.timeMs)), [filteredHourly]);

  const [firstIdx, setFirstIdx] = useState(currentIdx);
  const [showNowLabel, setShowNowLabel] = useState(true);

  // Smooth scroll for 6-hour jump
  const scrollBy6Hours = (dir) => {
    if (!scrollRef.current || !filteredHourly.length) return;

    const nextIdx = (firstIdx + dir * 6 + filteredHourly.length) % filteredHourly.length;
    setFirstIdx(nextIdx);
    setShowNowLabel(false);

    const container = scrollRef.current;
    const card = container.children[nextIdx];
    if (card) {
      container.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }
  };

  const visibleList = useMemo(() => {
    if (!filteredHourly.length) return [];
    return [...filteredHourly.slice(firstIdx), ...filteredHourly.slice(0, firstIdx)];
  }, [filteredHourly, firstIdx]);

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
        ticks: {
          color: "white",
          font: { size: 11 },
          callback: function (val, idx) {
            return idx === currentIdx ? "Now" : toHourLabel(this.getLabelForValue(val));
          },
        },
      },
      y: { ticks: { color: "white", font: { size: 11 } } },
    },
  };

  const handleDragStart = (pageX) => {
    isDragging.current = true;
    startX.current = pageX;
    scrollLeftStart.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const handleDragMove = (pageX) => {
    if (!isDragging.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = scrollLeftStart.current + startX.current - pageX;
  };
  const handleDragEnd = () => { isDragging.current = false; };

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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
            onClick={() => scrollBy6Hours(-1)}
          >
            <FaChevronLeft />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-hidden scroll-smooth py-2"
            onTouchStart={(e) => handleDragStart(e.touches[0].pageX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].pageX)}
            onTouchEnd={handleDragEnd}
            onMouseDown={(e) => {
              handleDragStart(e.pageX);
              e.preventDefault();
            }}
            onMouseMove={(e) => handleDragMove(e.pageX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {visibleList.map((h, i) => (
              <div
                key={h.key}
                className={`flex-shrink-0 space-y-3 w-32 flex flex-col min-h-[170px] items-start justify-start py-3 px-2 rounded-xl transition ${
                  i === 0 ? "bg-white/30 ring-2 ring-white/20" : "bg-white/6"
                }`}
              >
                <div className="text-[17px] text-gray-100">{i === 0 && showNowLabel ? "Now" : h.label}</div>
                <div className="text-6xl">{getIcon(h.code, h.isDay)}</div>
                <div className="font-semibold text-[17px]">{h.temp != null ? Math.round(h.temp) : "—"}°</div>
                <div className="text-sm text-gray-200">
                  Feels like {h.feels != null ? Math.round(h.feels) : "—"}°
                </div>
              </div>
            ))}
          </div>
          <button
            aria-label="Next hours"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
            onClick={() => scrollBy6Hours(1)}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
