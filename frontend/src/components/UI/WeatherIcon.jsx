import React from 'react';
// Maps OpenWeatherMap weather code to emoji
export function WeatherIcon({ code = 800, size = 20 }) {
  const icon =
    code >= 200 && code < 300 ? '⛈️' :
    code >= 300 && code < 400 ? '🌦️' :
    code >= 500 && code < 600 ? '🌧️' :
    code >= 600 && code < 700 ? '🌨️' :
    code >= 700 && code < 800 ? '🌫️' :
    code === 800               ? '☀️' :
    code === 801               ? '🌤️' :
    code === 802               ? '⛅' :
    code >= 803                ? '☁️' : '🌡️';
  return <span style={{ fontSize: size }}>{icon}</span>;
}
