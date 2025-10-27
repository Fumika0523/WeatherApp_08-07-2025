"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sunrise, Sunset } from "lucide-react";
import { motion } from "framer-motion";

export default function SunInfo({ daily }) {
  if (!daily?.sunrise || !daily?.sunset) return null;

  // --- timestamps (memoized) ---
  const sunriseMs = useMemo(() => new Date(daily.sunrise[0]).getTime(), [daily?.sunrise?.[0]]);
  const sunsetMs = useMemo(() => new Date(daily.sunset[0]).getTime(), [daily?.sunset?.[0]]);

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

  // --- viewBox geometry ---
  const vbWidth = 800;
  const vbHeight = 350;

  const marginX = 80;
  const leftX = marginX;
  const rightX = vbWidth - marginX;
  const cx = (leftX + rightX) / 2;
  const cy = 300;
  const radius = (rightX - leftX) / 2;

  const baselineY = cy + Math.round(radius * 0.14);

  // Sun position along semicircle: angle 0..PI
  const angle = Math.PI * progress;
  const sunX = cx + radius * Math.cos(Math.PI - angle);
  const sunY = cy - radius * Math.sin(Math.PI - angle);

  // day duration
  const totalMs = Math.max(0, sunsetMs - sunriseMs);
  const durationHrs = Math.floor(totalMs / 3600000);
  const durationMins = Math.floor((totalMs % 3600000) / 60000);

  // arc length
  const arcLength = Math.PI * radius;
  const dashoffset = arcLength * (1 - progress);

  const progressX = leftX + (rightX - leftX) * progress;

  // Responsive sizing
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

  const scale = containerWidth ? Math.min(1, containerWidth / vbWidth) : 1;

  // sizes
  const BASE = {
    arcStroke: 6,
    bgArcStroke: 8,
    baselineStroke: 4,
    baselineFillStroke: 10,
    sunRadius: 22,
    sunGlowR: 42,
    endBulletR: 10,
  };

 //const arcStroke = Math.round(BASE.arcStroke * scale);
  const arcStroke = Math.round(BASE.arcStroke / scale); 
  const bgArcStroke = Math.round(BASE.bgArcStroke * scale);
  const baselineStroke = Math.round(BASE.baselineStroke * scale);
  const baselineFillStroke = Math.round(BASE.baselineFillStroke * scale);
  const sunR = Math.round(BASE.sunRadius * scale);
  const sunGlowR = Math.round(BASE.sunGlowR * scale);
  const endBulletR = Math.round(BASE.endBulletR * scale);

  const transitionTiming =
    "transform 0.8s cubic-bezier(.22,1,.36,1), stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1), x2 0.8s cubic-bezier(.22,1,.36,1)";

    // console.log("SUn Info")

  return (
    <div className="rounded-2xl p-5  text-white bg-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-semibold text-gray-100">Sun</div>
      </div>

      <div ref={wrapRef} className="w-full ">
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-36 sm:h-40 md:h-30 "
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="msnSunGradient" x1="0" x2="1">
              <stop offset="0%" stopColor="#FFD54A" />
              <stop offset="50%" stopColor="#FF7043" />
              <stop offset="100%" stopColor="#8E24AA" />
            </linearGradient>

            <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation={Math.max(4, 6 * scale)} result="b" />
              <feBlend in="SourceGraphic" in2="b" mode="screen" />
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={`M ${leftX} ${cy} A ${radius} ${radius} 0 0 1 ${rightX} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={bgArcStroke}
            strokeLinecap="round"
          />

          {/* Progress arc */}
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

          {/* Sun */}
          <g transform={`translate(${sunX}, ${sunY})`} style={{ transition: transitionTiming }}>
            <circle r={sunR} fill="#FFD54A" stroke="#FFF5D1" strokeWidth={2} filter="url(#softGlow)" />
            <circle r={sunGlowR} fill="none" stroke="#FFD54A" strokeWidth={1} opacity="0.3" />
          </g>

          {/* Baseline */}
          <line
            x1={leftX}
            x2={rightX}
            y1={baselineY}
            y2={baselineY}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={baselineStroke}
            strokeLinecap="round"
          />
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

          {/* End bullets */}
          <circle cx={leftX} cy={baselineY} r={endBulletR} fill="#fff" />
          <circle cx={rightX} cy={baselineY} r={endBulletR} fill="#fff" />
        </svg>
      </div>

      {/* Day length */}
      <div className=" text-center mt-1 text-[18px] font-semibold text-gray-100">
        {durationHrs} hrs {durationMins} mins
      </div>

      {/* Sunrise / Sunset */}
      <div className="mt-2 flex justify-between">
        <div>
          <div className="text-2xl font-bold">
            {new Date(sunriseMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm text-gray-200 flex items-center justify-center">
            <Sunrise size={18} className="mr-1" /> Sunrise
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {new Date(sunsetMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm text-gray-200 flex items-center justify-center">
             <Sunset size={18} className="mr-1" />Sunset
          </div>
        </div>
      </div>
    </div>
  );
}
