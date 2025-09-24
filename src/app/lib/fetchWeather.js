export async function fetchWeather(lat, lon) {
  const weatherParams = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "windspeed_10m",
      "relativehumidity_2m",
      "visibility",
      "surface_pressure"
    ].join(","),
    hourly: [
      "apparent_temperature",
      "relativehumidity_2m"
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "moonrise",
      "moonset",
      "moonphase"
    ].join(","),
    timezone: "auto",
  });

const airParams = new URLSearchParams({
  latitude: lat,
  longitude: lon,
  hourly: [
    "pm10",
    "pm2_5",
    "carbon_monoxide",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "ozone",
    "aerosol_optical_depth",
    "dust",
    "uv_index",
    "uv_index_clear_sky"
  ].join(","),
  timezone: "auto",
});

  const [weatherRes, airRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`)
  ]);

  if (!weatherRes.ok || !airRes.ok) {
    throw new Error("Failed to fetch weather or air quality data");
  }

  const [weatherData, airData] = await Promise.all([
    weatherRes.json(),
    airRes.json()
  ]);

  // Merge air quality into weatherData for your component
  return {
    ...weatherData,
    air_quality: airData.hourly,
  };
}
