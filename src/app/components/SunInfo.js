"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sunrise, Sunset } from "lucide-react";

export default function SunInfo({ daily }) {
  if (!daily?.sunrise || !daily?.sunset) return null;

  // --- timestamps (memoized) ---
  const sunriseMs = useMemo(
    () => new Date(daily.sunrise[0]).getTime(),
    [daily?.sunrise?.[0]]
  );
  const sunsetMs = useMemo(
    () => new Date(daily.sunset[0]).getTime(),
    [daily?.sunset?.[0]]
  );

  // progress 0..1
  const [progress, setProgress] = useState(() => {
    const now = Date.now();
    return Math.max(0, Math.min(1, (now - sunriseMs) / Math.max(1, sunsetMs - sunriseMs)));
  });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const p = Math.max(0, Math.min(1, (now - sunriseMs) / Math.max(1, sunsetMs - sunriseMs)));
      setProgress(p);
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, [sunriseMs, sunsetMs]);

  // --- viewBox geometry (works responsively because svg scales) ---
  const vbWidth = 1000; // viewBox width
  const vbHeight = 560; // increased height for glow headroom

  // margins inside the viewBox
  const marginX = 80;
  const leftX = marginX;
  const rightX = vbWidth - marginX;
  const cx = (leftX + rightX) / 2; // center x for arc
  const cy = 300; // center y for arc (baseline sits a bit lower)
  const radius = (rightX - leftX) / 2; // semicircle radius

  // baseline (thin line under the arc) y position
  const baselineY = cy + Math.round(radius * 0.14); // slight offset down

  // Sun position along semicircle: angle 0..PI
  const angle = Math.PI * progress;
  const sunX = cx + radius * Math.cos(Math.PI - angle);
  const sunY = cy - radius * Math.sin(Math.PI - angle);

  // day duration
  const totalMs = Math.max(0, sunsetMs - sunriseMs);
  const durationHrs = Math.floor(totalMs / 3600000);
  const durationMins = Math.floor((totalMs % 3600000) / 60000);

  // arc length approximation (semicircle)
  const arcLength = Math.PI * radius;
  const dashoffset = arcLength * (1 - progress);

  // baseline progress x (for the thin filled line under the arc)
  const progressX = leftX + (rightX - leftX) * progress;

  // --------------------------
  // Responsive sizing (reduce stroke widths / radii on very small screens)
  // --------------------------
  const wrapRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || el.getBoundingClientRect().width);

    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth || el.getBoundingClientRect().width);
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // scale relative to viewBox width; cap at 1 (don't upscale)
  const scale = containerWidth ? Math.min(1, containerWidth / vbWidth) : 1;

  // ---- INCREASED BASE SIZES TO MAKE LINES THICKER ----
  const BASE = {
    arcStroke: 16,         // main progress arc (was 10)
    bgArcStroke: 10,       // background arc (was 6)
    baselineStroke: 6,     // baseline line (was 4)
    baselineFillStroke: 12,// baseline filled progress (was 6)
    sunRadius: 24,         // sun circle (slightly larger)
    sunGlowR: 44,          // glow radius
    endBulletR: 12,        // end bullets
  };

  // apply scale but clamp to sensible minimums
  const arcStroke = Math.max(3, Math.round(BASE.arcStroke * scale));
  const bgArcStroke = Math.max(2, Math.round(BASE.bgArcStroke * scale));
  const baselineStroke = Math.max(1.5, Math.round(BASE.baselineStroke * scale));
  const baselineFillStroke = Math.max(3, Math.round(BASE.baselineFillStroke * scale));
  const sunR = Math.max(8, Math.round(BASE.sunRadius * scale));
  const sunGlowR = Math.max(18, Math.round(BASE.sunGlowR * scale));
  const endBulletR = Math.max(4, Math.round(BASE.endBulletR * scale));

  // transition timing / easing for nicer motion
  const transitionTiming = "transform 0.8s cubic-bezier(.22,1,.36,1), stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1), x2 0.8s cubic-bezier(.22,1,.36,1)";

  return (
    <div className="rounded-2xl p-4 sm:p-6 text-white bg-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl font-medium text-gray-100">Sun</div>
      </div>

      {/* Wrap (used for measuring) */}
      <div ref={wrapRef} className="w-full mt-4">
        {/* Responsive SVG - scales to container width
            overflow visible prevents filter/glow clipping
        */}
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-32 sm:h-36 md:h-40"
          aria-hidden="true"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="msnSunGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFD54A" />
              <stop offset="60%" stopColor="#FFB74D" />
              <stop offset="100%" stopColor="#FF8A00" />
            </linearGradient>

            {/* soft glow - filter bounds are generous */}
            <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%" filterUnits="objectBoundingBox">
              <feGaussianBlur stdDeviation={Math.max(4, 6 * scale)} result="b" />
              <feBlend in="SourceGraphic" in2="b" mode="screen" />
            </filter>
          </defs>

          {/* background semicircle (subtle) */}
          <path
            d={`M ${leftX} ${cy} A ${radius} ${radius} 0 0 1 ${rightX} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={bgArcStroke}
            strokeLinecap="round"
          />

          {/* progress arc */}
          <path
            d={`M ${leftX} ${cy} A ${radius} ${radius} 0 0 1 ${rightX} ${cy}`}
            fill="none"
            stroke="url(#msnSunGradient)"
            strokeWidth={arcStroke}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashoffset}
            style={{ transition: transitionTiming }}
          />

          {/* sun group with easing */}
          <g transform={`translate(${sunX}, ${sunY})`} style={{ transition: transitionTiming }}>
            <circle r={sunR} fill="#FFD54A" stroke="#FFF5D1" strokeWidth={Math.max(1, Math.round(2 * scale))} filter="url(#softGlow)" />
            <g opacity="0.35">
              <circle r={sunGlowR} fill="none" stroke="#FFD54A" strokeWidth={Math.max(1, Math.round(2 * scale))} />
            </g>
          </g>

          {/* baseline (thin line under arc) */}
          <line
            x1={leftX}
            x2={rightX}
            y1={baselineY}
            y2={baselineY}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={baselineStroke}
            strokeLinecap="round"
          />

          {/* baseline progress fill */}
          <line
            x1={leftX}
            x2={progressX}
            y1={baselineY}
            y2={baselineY}
            stroke="url(#msnSunGradient)"
            strokeWidth={baselineFillStroke}
            strokeLinecap="round"
            style={{ transition: transitionTiming }}
          />

          {/* end bullets on baseline */}
          <circle cx={leftX} cy={baselineY} r={endBulletR} fill="#fff" opacity="0.95" />
          <circle cx={rightX} cy={baselineY} r={endBulletR} fill="#fff" opacity="0.95" />
        </svg>
      </div>

      {/* times */}
      <div className="mt-3 flex items-start justify-between text-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-white" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">
              {new Date(sunriseMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center">
              <Sunrise size={18} className="mr-1" />
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold">
              {new Date(sunsetMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center justify-end">
              <Sunset size={18} className="ml-1" />
            </span>
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-white" />
        </div>
      </div>

      {/* day duration */}
      <div className="mt-2 text-sm text-center text-gray-400">
        Day length: {durationHrs}h {durationMins}m
      </div>
    </div>
  );
}
