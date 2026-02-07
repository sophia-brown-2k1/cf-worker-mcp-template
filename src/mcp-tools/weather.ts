/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";

export const WeatherToolDef: ToolDefinition = {
  name: "weather",
  description: "GET weather data (mặc định: Hà Nội, Việt Nam)",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

export const handleWeatherTool: ToolHandler = async (
  _args: Record<string, unknown>,
  _env: Env,
) => {
  try {
    // Mặc định: Hà Nội, Việt Nam
    const latitude = 21.0285;
    const longitude = 105.8542;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    url.searchParams.set("current_weather", "true");
    // Có thể thêm timezone nếu muốn
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString());

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch weather data",
          upstreamStatus: res.status,
          upstreamStatusText: res.statusText,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await res.json();
    const current = data.current_weather;

    const summary =
      current && typeof current.temperature !== "undefined"
        ? `Thời tiết hiện tại ở Hà Nội (VN): ${current.temperature}°C, gió ${current.windspeed} km/h.`
        : "Không có dữ liệu thời tiết hiện tại.";

    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: summary,
          },
          {
            type: "json",
            json: data,
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("weather tool error", err);
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "Unknown error fetching weather",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
