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
const toHourLabel = (time) => {
  const d = new Date(time);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  return `<div style="min-width:110px; background:rgba(6,8,20,0.9); padding:12px; border-radius:10px; d-flex items-start justify-start color:white; box-shadow:0 6px 18px rgba(0,0,0,0.45)" >
    <div style="font-size:12px; color:#cbd5e1; margin-bottom:6px">${toHourLabel(d.timeMs)}</div>
    <div style="margin-bottom:6px">
      <div style="font-size:35px">${getIcon(d.code, d.isDay).props.children ?? ""}</div>
      <div>
        <div style="font-weight:700; font-size:16px">${Math.round(d.temp ?? 0)}°</div>
        <div style="font-size:12px; color:#cbd5e1">Feels like: ${Math.round(d.feels ?? d.temp ?? 0)}°</div>
      </div>
    </div>
    <div style="font-size:12px; color:#cbd5e1">
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

  const hourly = useMemo(() => {
    const hRaw = weatherData?.hourly || {};
    const daily = weatherData?.daily || {};

    if (!hRaw.time) return [];

    return hRaw.time.map((time, i) => {
      const dObj = new Date(time);
      const temp = hRaw.temperature_2m?.[i] ?? null;
      const feels = hRaw.apparent_temperature?.[i] ?? temp;
      const wind =
        [hRaw.windspeed_10m, hRaw.windspeed_2m, hRaw.windspeed].map(arr => arr?.[i]).find(Boolean) ?? null;
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
        wind: wind != null ? Math.round(wind * 3.6) : null,
        humidity,
        code,
        isDay,
      };
    });
  }, [weatherData]);

  const filteredHourly = useMemo(() => {
    if (!hourly.length) return [];
    const today = new Date();
    const selDate = selectedDay ? new Date(selectedDay) : today;
    if (isNaN(selDate)) return hourly;

    return hourly.filter(h => {
      const d = new Date(h.time);
      return d.toDateString() === selDate.toDateString();
    });
  }, [hourly, selectedDay]);

  const isSelectedToday = useMemo(() => {
    if (!filteredHourly.length) return false;
    const todayStr = new Date().toDateString();
    return !selectedDay || new Date(selectedDay).toDateString() === todayStr;
  }, [selectedDay, filteredHourly]);

  const exactNowIndex = useMemo(() => {
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

  useEffect(() => {
    if (isSelectedToday && exactNowIndex >= 0) setCurrentIdx(exactNowIndex);
  }, [isSelectedToday, exactNowIndex]);

  const scrollToIndex = (index) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[index];
    if (!card) return;
    scrollRef.current.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    const cardWidth = 128;
    scrollRef.current.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  const accent = "#facc15";
  const limitedHourly = filteredHourly.slice(0, 24);

  const data = {
    labels: limitedHourly.map(h => h.timeMs),
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
          tooltipEl.style.opacity = tooltip.opacity === 0 ? 0 : 1;
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
        time: { unit: "hour", tooltipFormat: "HH:mm", displayFormats: { hour: "HH:mm" } },
        ticks: {
          color: "white",
          font: { size: 11 },
          callback: (val, idx) => {
            const d = new Date(val);
            if (isNaN(d)) return "";
            if (idx === currentIdx) return "Now";
            return d.getHours() % 3 === 0 ? toHourLabel(d) : "";
          },
        },
      },
      y: { ticks: { color: "white", font: { size: 11 } } },
    },
  };

  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-4 mt-6 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Hourly</h3>
        <div className="bg-white/10 rounded-full flex text-sm">
          <button
            onClick={() => setViewMode("Chart")}
            className={`px-4 py-2 rounded-full flex gap-1 items-center ${
              viewMode === "Chart" ? "bg-white/30" : "text-gray-200"
            }`}
          >
            <RiLineChartLine className="text-[20px]" /> <span className="hidden md:block">Chart</span>
          </button>
          <button
            onClick={() => setViewMode("List")}
            className={`px-4 py-2 rounded-full flex gap-1 items-center ${
              viewMode === "List" ? "bg-white/30" : "text-gray-200"
            }`}
          >
            <CiCircleList className="text-[20px]" /> <span className="hidden md:block">List</span>
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
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black h-[40px] rounded-sm flex items-center justify-center"
            onClick={() => scrollBy(-4)}
          >
            <IoMdArrowDropleft className="text-2xl" />
          </button>

          <div ref={scrollRef} className="flex gap-5 overflow-x-hidden scroll-smooth py-2">
            {filteredHourly.map((h, i) => {
              const showNow = i === currentIdx && isSelectedToday;
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
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black h-[40px] rounded-sm flex items-center justify-center"
            onClick={() => scrollBy(4)}
          >
            <IoMdArrowDropright className="text-2xl" />
          </button>
        </div>
      )}
    </section>
  );
}
