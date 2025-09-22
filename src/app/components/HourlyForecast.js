"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { IoIosSunny } from "react-icons/io";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  FaSun,
  FaCloud,
  FaCloudRain,
  FaSnowflake,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { RiLineChartLine } from "react-icons/ri";
import { CiCircleList } from "react-icons/ci";

/* ---------------------- Helpers ---------------------- */
function toHourLabel(isoOrMs) {
  try {
    const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoOrMs;
  }
}
function closestIndex(times, now = new Date()) {
  if (!times || !times.length) return 0;
  let best = 0,
    bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}
function getIcon(code, isDay) {
  if (code === 0) return isDay ? <IoIosSunny className="text-yellow-500"/> : <IoIosSunny className="text-yellow-500" />;
  if ([1, 2, 3].includes(code)) return <FaCloud />;
  if ([45, 48].includes(code)) return <FaCloud />;
  if ([51, 61, 80].includes(code)) return <FaCloudRain />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <FaSnowflake />;
  return <FaCloud />;
}

/* ---------------------- Chart Tooltip ---------------------- */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className=""
      style={{
        minWidth: 150,
        background: "rgba(6,8,20,0.9)",
        padding: 12,
        borderRadius: 10,
        color: "white",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
      }}
    >
      <div className="" style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
        {toHourLabel(d.timeMs ?? d.time)}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 35 }}>{getIcon(d.code, d.isDay)}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{Math.round(d.temp ?? 0)}°</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Feels like: {Math.round(d.feels ?? d.temp ?? 0)}°</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#cbd5e1" }}>
        <div>Precip: {d.precipDisplay ?? 0}{d.precipIsProb ? "%" : " mm"}</div>
        <div>Wind: {d.wind ?? "—"} km/h</div>
        <div>Humidity: {d.humidity ?? "—"}%</div>
      </div>
    </div>
  );
}

/* ---------------------- Main Component ---------------------- */
export default function HourlyForecast({ weatherData, selectedDay }) {
  /* Hooks (always called) */
  const [viewMode, setViewMode] = useState("Chart");
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  /* Defensive: if no hourly data, render nothing */
  const hRaw = weatherData?.hourly || {};
  const daily = weatherData?.daily || {};

  /* Build hourly rows (include numeric timeMs for X axis) */
  const hourly = useMemo(() => {
    if (!hRaw?.time) return [];
    const rows = [];
    for (let i = 0; i < hRaw.time.length; i++) {
      const time = hRaw.time[i];
      const timeMs = new Date(time).getTime();
      const dObj = new Date(time);

      const temp = hRaw.temperature_2m?.[i] ?? null;
      const feels = hRaw.apparent_temperature?.[i] ?? temp;
      const precip = hRaw.precipitation?.[i] ?? 0;
      const precipProb = hRaw.precipitation_probability?.[i] ?? null;

      const rawWind = hRaw.windspeed_10m?.[i] ?? hRaw.windspeed_2m?.[i] ?? hRaw.windspeed?.[i] ?? null;
      const wind = rawWind != null ? Math.round(rawWind * 3.6) : null;

      const humidity = hRaw.relativehumidity_2m?.[i] ?? null;
      const code = hRaw.weathercode?.[i] ?? 0;

      // day/night determination if sunrise/sunset available
      let isDay = dObj.getHours() >= 6 && dObj.getHours() < 18;
      if (daily?.time?.length && daily.sunrise && daily.sunset) {
        const dayIndex = daily.time.findIndex((t) => {
          const dt = new Date(t);
          return (
            dt.getFullYear() === dObj.getFullYear() &&
            dt.getMonth() === dObj.getMonth() &&
            dt.getDate() === dObj.getDate()
          );
        });
        if (dayIndex >= 0) {
          const sr = new Date(daily.sunrise[dayIndex]).getTime();
          const ss = new Date(daily.sunset[dayIndex]).getTime();
          isDay = dObj.getTime() >= sr && dObj.getTime() <= ss;
        }
      }

      rows.push({
        key: `hour-${time}`,
        time,
        timeMs,
        label: toHourLabel(time),
        temp,
        feels,
        precip,
        precipProb,
        wind,
        humidity,
        code,
        isDay,
        precipDisplay: precip > 0 ? precip : precipProb ?? 0,
        precipIsProb: !(precip > 0) && precipProb != null,
      });
    }
    return rows;
  }, [hRaw, daily]);

  /* Filter by selected day (robust to different selectedDay formats) */
  const filteredHourly = useMemo(() => {
    if (!hourly || !hourly.length) return [];
    if (!selectedDay) return hourly;

    // support either "YYYY-MM-DD" or "DD" (day-only) as selectedDay:
    const dayOnlyMatch = /^\d{1,2}$/.test(selectedDay);
    const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(selectedDay);
    if (dayOnlyMatch) {
      const dayNum = Number(selectedDay);
      return hourly.filter((h) => {
        const d = new Date(h.time);
        return d.getDate() === dayNum;
      });
    }
    // fallback parse as date
    const sel = new Date(selectedDay);
    if (!isNaN(sel.getTime())) {
      return hourly.filter((h) => {
        const d = new Date(h.time);
        return (
          d.getFullYear() === sel.getFullYear() &&
          d.getMonth() === sel.getMonth() &&
          d.getDate() === sel.getDate()
        );
      });
    }
    // if unrecognized format, return all
    return hourly;
  }, [hourly, selectedDay]);

  /* current index relative to filteredHourly (by timeMs) */
  const currentIdx = useMemo(() => {
    if (!filteredHourly || !filteredHourly.length) return 0;
    return closestIndex(filteredHourly.map((h) => h.timeMs), new Date());
  }, [filteredHourly]);

  /* chart constants */
  const accent = "#facc15";
  const areaId = `area-${accent.replace("#", "")}`;

  /* custom activeDot — Recharts gives coords so we render exactly where it should be */
  const activeDot = (props) => {
    const { cx, cy, payload } = props;
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill={accent} stroke="#fff" strokeWidth={2} />
      </g>
    );
  };

  /* scrolling helpers for list mode */
  const scrollBy = (direction) => {
    if (!scrollRef.current) return;
    const cardWidth = 120;
    scrollRef.current.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };

  /* auto-center current hour on mount & data change */
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const container = scrollRef.current;
        if (!container || !filteredHourly || filteredHourly.length === 0) return;
        const idx = Math.min(currentIdx, filteredHourly.length - 1);
        const card = container.children[idx];
        if (!card) return;
        const containerWidth = container.offsetWidth;
        const cardLeft = card.offsetLeft;
        const cardWidth = card.offsetWidth;
        container.scrollLeft = Math.max(0, cardLeft - containerWidth / 2 + cardWidth / 2);
      } catch {}
    }, 80);
    return () => clearTimeout(timer);
  }, [filteredHourly, currentIdx]);

  /* dragging handlers for list */
  const onTouchStart = (e) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX;
    scrollLeftStart.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e) => {
    if (!isDragging.current || !scrollRef.current) return;
    const x = e.touches[0].pageX;
    const walk = startX.current - x;
    scrollRef.current.scrollLeft = scrollLeftStart.current + walk;
  };
  const onTouchEnd = () => { isDragging.current = false; };
  const onMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX;
    scrollLeftStart.current = scrollRef.current?.scrollLeft ?? 0;
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!isDragging.current || !scrollRef.current) return;
    const walk = startX.current - e.pageX;
    scrollRef.current.scrollLeft = scrollLeftStart.current + walk;
  };
  const onMouseUpOrLeave = () => { isDragging.current = false; };

  /* Render */
  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-4 mt-6 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Hourly</h3>
        <div className="bg-white/10  rounded-full  flex text-sm">
          <button
            onClick={() => setViewMode("Chart")}
            className={`px-4 py-2 rounded-full flex gap-1 justify-center items-center  ${viewMode === "Chart" ? "bg-white/30" : "text-gray-200"}`}
          >
            <RiLineChartLine className="text-[20px]"/>
            <span className="sm:hidden md:block">Chart</span>   
          </button>
          <button
            onClick={() => setViewMode("List")}
            className={`px-4 py-2 rounded-full ${viewMode === "List" ? "bg-white/30" : "text-gray-200"}`}
          >
            <CiCircleList className="text-[20px]"/> 
            <span className="md:block sm:hidden">List</span>
          </button>
        </div>
      </div>

      {/* nothing for selected day */}
      {(!filteredHourly || filteredHourly.length === 0) && (
        <div className="text-center text-gray-300">No hourly data for selected day</div>
      )}

      {/* Chart view */}
      {filteredHourly && filteredHourly.length > 0 && viewMode === "Chart" && (
        <div className="w-full h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredHourly}>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.36} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#ffffff10" vertical={false} />
              {/* use numeric timeMs on X axis (scale=time) so activeDot aligns exactly */}
              <XAxis
                type="number"
                dataKey="timeMs"
                scale="time"
                domain={["auto", "auto"]}
                tickFormatter={(ms) => toHourLabel(ms)}
                tick={{ fill: "white", fontSize: 11 }}
                interval={Math.max(0, Math.floor(filteredHourly.length / 8))}
              />
              <YAxis yAxisId="left" tick={{ fill: "white", fontSize: 11 }} width={36} />

              <Tooltip content={<ChartTooltip />} />

              {/* area (temperature) — dot hidden, activeDot used for hover position */}
              <Area
                yAxisId="left"
                dataKey="temp"
                type="monotone"
                stroke={accent}
                fill={`url(#${areaId})`}
                strokeWidth={2}
                dot={false}
                activeDot={activeDot}
              />

              {/* feels-like dashed overlay */}
              <Line
                yAxisId="left"
                dataKey="feels"
                type="monotone"
                stroke="#f97316"
                strokeWidth={1.6}
                dot={false}
                strokeDasharray="4 6"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* List view (horizontal scroll with arrows) */}
      {filteredHourly && filteredHourly.length > 0 && viewMode === "List" && (
        <div className="relative">
          <button
            aria-label="Previous hours"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
            onClick={() => scrollBy(-1)}
          >
            <FaChevronLeft />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-hidden scroll-smooth py-2"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
          >
            {filteredHourly.map((h, i) => {
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={`hour-card-${h.key}`}
                  className={`flex-shrink-0 space-y-3 w-28 h-full flex flex-col items-start justify-center text-center py-3 px-2 rounded-xl transition ${
                    isCurrent ? "bg-white/30 ring-2 ring-white/20" : "bg-white/6"
                  }`}
                >
                  <div className="text-[15px] text-gray-100 mb-1">{h.label}</div>
                  <div className="mb-1 text-2xl">{getIcon(h.code, h.isDay)}</div>
                  <div className="font-semibold">{h.temp != null ? Math.round(h.temp) : "—"}°</div>
                  <div className="text-xs text-gray-300">Feels {h.feels != null ? Math.round(h.feels) : "—"}°</div>
                  <div className="text-xs text-gray-300 mt-1">{h.precipDisplay ? `${h.precipDisplay}${h.precipIsProb ? "%" : " mm"}` : ""}</div>
                </div>
              );
            })}
          </div>

          <button
            aria-label="Next hours"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full"
            onClick={() => scrollBy(1)}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
