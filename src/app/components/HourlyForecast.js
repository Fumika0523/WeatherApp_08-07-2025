"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
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

/* ---------------------- Helpers ---------------------- */
function toHourLabel(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
function closestIndex(times, now = new Date()) {
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
  if (code === 0) return isDay ? <FaSun /> : <FaSun />;
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
    <div
      style={{
        minWidth: 220,
        background: "rgba(6,8,20,0.9)",
        padding: 12,
        borderRadius: 10,
        color: "white",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 20 }}>{getIcon(d.code, d.isDay)}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{d.temp ?? "—"}°</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Feels like: {d.feels ?? "—"}°</div>
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
export default function HourlyForecast({ weatherData, selectedDay, displayedHourly }) {
  /* Hooks (always called) */
  const [viewMode, setViewMode] = useState("Chart");
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  /* Early empty data fallback handled inside JSX */
  const hRaw = weatherData?.hourly || {};
  const daily = weatherData?.daily || {};
  const count = Math.min(48, (hRaw.time || []).length);

const hourly = useMemo(() => {
  if (!hRaw?.time) return [];

  const rows = [];
  for (let i = 0; i < hRaw.time.length; i++) {
    const time = hRaw.time[i];
    const dObj = new Date(time);

    const temp = hRaw.temperature_2m?.[i] ?? null;
    const feels = hRaw.apparent_temperature?.[i] ?? temp;
    const precip = hRaw.precipitation?.[i] ?? 0;
    const precipProb = hRaw.precipitation_probability?.[i] ?? null;

    const rawWind =
      hRaw.windspeed_10m?.[i] ?? hRaw.windspeed_2m?.[i] ?? hRaw.windspeed?.[i] ?? null;
    const wind = rawWind != null ? Math.round(rawWind * 3.6) : null;

    const humidity = hRaw.relativehumidity_2m?.[i] ?? null;
    const code = hRaw.weathercode?.[i] ?? 0;

    // Determine if it's day based on sunrise/sunset if available
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

  // If selectedDay is set, filter for that day
  if (selectedDay) {
    const selected = new Date(selectedDay);
    return rows.filter((h) => {
      const d = new Date(h.time);
      return (
        d.getFullYear() === selected.getFullYear() &&
        d.getMonth() === selected.getMonth() &&
        d.getDate() === selected.getDate()
      );
    });
  }

  return rows;
}, [hRaw, daily, selectedDay]);


const filteredHourly = hourly;


  const currentIdx = useMemo(
    () => closestIndex(filteredHourly.map((h) => h.time), new Date()),
    [filteredHourly]
  );

  const accent = "#facc15";
  const areaId = `area-${accent.replace("#", "")}`;

  function customDot({ cx, cy, index }) {
    const isCurrent = index === currentIdx;
    const r = isCurrent ? 6 : 3;
    const stroke = isCurrent ? "#fff" : "rgba(255,255,255,0.9)";
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={r}
        stroke={stroke}
        strokeWidth={isCurrent ? 2 : 1}
        fill={accent}
      />
    );
  }

  /* Scroll handlers (drag) */
  const scrollBy = (direction) => {
    if (!scrollRef.current) return;
    const cardWidth = 120;
    scrollRef.current.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const container = scrollRef.current;
        if (!container) return;
        const card = container.children[currentIdx];
        if (!card) return;
        const containerWidth = container.offsetWidth;
        const cardLeft = card.offsetLeft;
        const cardWidth = card.offsetWidth;
        container.scrollLeft = Math.max(0, cardLeft - containerWidth / 2 + cardWidth / 2);
      } catch {}
    }, 80);
    return () => clearTimeout(timer);
  }, [filteredHourly, currentIdx]);

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

  return (
    <section className="bg-white/5 backdrop-blur rounded-2xl p-4 mt-6 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Hourly</h3>
        <div className="bg-white/10 rounded-full p-1 flex text-sm">
          <button
            onClick={() => setViewMode("Chart")}
            className={`px-3 py-1 rounded-full ${viewMode === "Chart" ? "bg-white/30" : "text-gray-200"}`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode("List")}
            className={`px-3 py-1 rounded-full ${viewMode === "List" ? "bg-white/30" : "text-gray-200"}`}
          >
            List
          </button>
        </div>
      </div>

      {(!filteredHourly || filteredHourly.length === 0) && (
        <div className="text-center text-gray-300">No hourly data for selected day</div>
      )}

      {filteredHourly && filteredHourly.length > 0 && (
        <>
          {viewMode === "Chart" && (
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
                  <XAxis dataKey="label" tick={{ fill: "white", fontSize: 11 }} interval={Math.max(0, Math.floor(filteredHourly.length / 8))} />
                  <YAxis yAxisId="left" tick={{ fill: "white", fontSize: 11 }} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    yAxisId="left"
                    dataKey="temp"
                    type="monotone"
                    stroke={accent}
                    fill={`url(#${areaId})`}
                    strokeWidth={2}
                    dot={customDot}
                  />
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

          {viewMode === "List" && (
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
                      className={`flex-shrink-0 w-28 text-center py-3 px-2 rounded-xl transition ${isCurrent ? "bg-white/30 ring-2 ring-white/20" : "bg-white/6"}`}
                    >
                      <div className="text-xs text-gray-200 mb-1">{h.label}</div>
                      <div className="mb-1 text-xl">{getIcon(h.code, h.isDay)}</div>
                      <div className="font-semibold">{h.temp ?? "—"}°</div>
                      <div className="text-xs text-gray-300">Feels {h.feels ?? "—"}°</div>
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
        </>
      )}
    </section>
  );
}
