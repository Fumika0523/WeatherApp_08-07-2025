export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    // 👇 Current weather values
    current: [
      "temperature_2m",
      "apparent_temperature",
      "windspeed_10m",
      "relativehumidity_2m",
      "visibility",
      "surface_pressure"
    ].join(","),

    // 👇 Hourly values
    hourly: [
      "apparent_temperature",
      "relativehumidity_2m",
      "us_aqi",
      "european_aqi"
    ].join(","),

    // 👇 Daily values
    daily: ["temperature_2m_max", "temperature_2m_min", "sunrise", "sunset"].join(","),

    air_quality: "true", // 👈 Enable Air Quality
    timezone: "auto",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch weather data");
  }

  const data = await res.json();
  return data;
}
