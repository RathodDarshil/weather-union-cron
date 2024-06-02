import AWS from "aws-sdk";
import axios from "axios";

const SNS_CONFIG = {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "ap-south-1",
};

const AWS_SNS = new AWS.SNS(SNS_CONFIG);

const WU_BASE_URL = "https://www.weatherunion.com/gw/weather/external/v0";

const localities = [
    {
        name: "Koramangala",
        id: "ZWL001156",
    },
    {
        name: "BTM Layout",
        id: "ZWL006600",
    },
    {
        name: "Bannerghatta Road",
        id: "ZWL004924",
    },
    {
        name: "Bellandur",
        id: "ZWL004164",
    },
    {
        name: "Sarjapur road",
        id: "ZWL002292",
    },
];

export interface IWUResponse {
    status: string;
    message: string;
    device_type: number;
    locality_weather_data: LocalityWeatherData;
}

export interface LocalityWeatherData {
    temperature: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
    rain_intensity: number;
    rain_accumulation: number;
}

type WeatherData = {
    id: string;
    name: string;
    weather: IWUResponse;
};

const run = async () => {
    try {
        let weather_data: WeatherData[] = [];
        let hsr_rain = false;
        let hsr_could_rain = "";

        const hsr_weather_data = await axios.get<IWUResponse>(WU_BASE_URL + "/get_locality_weather_data", {
            params: {
                locality_id: "ZWL001196",
            },
            headers: {
                "Content-Type": "application/json",
                "x-zomato-api-key": "9b7d395c2c96b33410d28bba7ccaf081",
            },
        });

        if (!!hsr_weather_data) {
            if (hsr_weather_data.data.locality_weather_data.rain_intensity > 0) {
                hsr_rain = true;
            }
        }

        for (const l of localities) {
            const data = await axios.get<IWUResponse>(WU_BASE_URL + "/get_locality_weather_data", {
                params: {
                    locality_id: l.id,
                },
                headers: {
                    "Content-Type": "application/json",
                    "x-zomato-api-key": "9b7d395c2c96b33410d28bba7ccaf081",
                },
            });

            weather_data.push({
                ...l,
                weather: data.data,
            });
        }

        for (const w of weather_data) {
            switch (w.id) {
                case localities[0].id:
                    if (
                        !!w.weather.locality_weather_data.wind_direction &&
                        w.weather.locality_weather_data.wind_direction >= 100 &&
                        w.weather.locality_weather_data.wind_direction <= 170 &&
                        w.weather.locality_weather_data.rain_accumulation > 0
                    ) {
                        hsr_could_rain = w.name;
                    }
                    break;

                case localities[1].id:
                    if (
                        !!w.weather.locality_weather_data.wind_direction &&
                        w.weather.locality_weather_data.wind_direction >= 30 &&
                        w.weather.locality_weather_data.wind_direction <= 150 &&
                        w.weather.locality_weather_data.rain_accumulation > 0
                    ) {
                        hsr_could_rain = w.name;
                    }
                    break;

                case localities[2].id:
                    if (
                        !!w.weather.locality_weather_data.wind_direction &&
                        w.weather.locality_weather_data.wind_direction >= 20 &&
                        w.weather.locality_weather_data.wind_direction <= 90 &&
                        w.weather.locality_weather_data.rain_accumulation > 0
                    ) {
                        hsr_could_rain = w.name;
                    }
                    break;

                case localities[3].id:
                    if (
                        !!w.weather.locality_weather_data.wind_direction &&
                        w.weather.locality_weather_data.wind_direction >= 200 &&
                        w.weather.locality_weather_data.wind_direction <= 290 &&
                        w.weather.locality_weather_data.rain_accumulation > 0
                    ) {
                        hsr_could_rain = w.name;
                    }
                    break;

                case localities[4].id:
                    if (
                        !!w.weather.locality_weather_data.wind_direction &&
                        w.weather.locality_weather_data.wind_direction >= 270 &&
                        w.weather.locality_weather_data.wind_direction <= 315 &&
                        w.weather.locality_weather_data.rain_accumulation > 0
                    ) {
                        hsr_could_rain = w.name;
                    }
                    break;
                default:
                    break;
            }
        }

        // console.log("hsr_weather_data", hsr_rain, hsr_could_rain);

        if (hsr_rain || !!hsr_could_rain) {
            let message = "";

            if (hsr_rain) {
                message = "It's raining in HSR!";
            }

            if (!!hsr_could_rain) {
                message = `It could rain in HSR, currently raining in ${hsr_could_rain}`;
            }

            if (hsr_rain && !!hsr_could_rain) {
                message = `Rain could potentially extend from ${hsr_could_rain}`;
            }

            await AWS_SNS.publish({
                TopicArn: "arn:aws:sns:ap-south-1:125629358976:WU-darshil",
                Message: message,
            }).send();
        }

        return {
            statusCode: 200,
            body: JSON.stringify("Ran successfully!"),
        };
    } catch (error) {
        console.log("Failied > ", error);

        return {
            statusCode: 500,
            body: JSON.stringify("Function failed!"),
        };
    }
};

run();

/**
    SE - Kora, (100-170)
    E - BTM (30-150)
    NE - Bannerghatta (20-90)
    W, SW - Bellandur (290-200)
    W, NW - Sarjapur (270-315)
*/
