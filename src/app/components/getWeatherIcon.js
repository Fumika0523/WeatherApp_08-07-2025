"use client";

import React from 'react'
import { FaCloudSun } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { FaCloud, FaSearch, FaWind, FaCloudRain, FaListUl, FaMap, FaSlidersH, FaSnowflake, FaBolt } from 'react-icons/fa';
import { IoSunny } from "react-icons/io5";
import { BsFillCloudFogFill } from "react-icons/bs";
import { BsFillSunsetFill } from "react-icons/bs";
import { BsFillSunriseFill } from "react-icons/bs";


// Map Open-Meteo weather codes to icons

const getWeatherIcon = (code, size = "text-[3rem]") => {
  if ([0].includes(code)) return <IoSunny className={`text-amber-500 ${size}`} />; // Clear sky
  if ([1, 2].includes(code)) return < FaCloudSun className={`text-gray-400 ${size}`} />; // Partly cloudy
  if ([3].includes(code)) return <FaCloud className={`text-gray-500 ${size}`} />; // Overcast
  if ([45, 48].includes(code)) return <BsFillCloudFogFill className={`text-gray-300 ${size}`} />; // Fog
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <FaCloudRain className={`text-blue-200 ${size}`} />; // Rain
  if ([71, 73, 75, 85, 86].includes(code)) return <FaSnowflake className={`text-blue-200 ${size}`} />; // Snow
  if ([95, 96, 99].includes(code)) return <FaBolt className={`text-yellow-400 ${size}`} />; // Thunderstorm
  return <FaCloud className={`text-gray-400 ${size}`} />; // Default cloudy
}

export default getWeatherIcon