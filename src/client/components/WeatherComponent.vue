<template>
  <div class="weather-component">
    <div class="weather-header">
      <div class="location">
  {{ locationName || 'Current Location' }}
  <div v-if="locationName && locationDetails" class="location-details">{{ locationDetails }}</div>
</div>
      <div class="last-updated">Updated: {{ lastUpdated }}</div>
    </div>
    
    <div class="current-weather">
      <div class="temperature">
        {{ currentTemp }}<span class="unit">°{{ isCelsius ? 'C' : 'F' }}</span>
      </div>
      <div class="weather-icon">
        <i :class="weatherIcon"></i>
      </div>
      <div class="conditions">
        <div class="condition">{{ currentCondition }}</div>
        <div class="hi-low">
          H: {{ highTemp }}°{{ isCelsius ? 'C' : 'F' }} 
          L: {{ lowTemp }}°{{ isCelsius ? 'C' : 'F' }}
        </div>
      </div>
    </div>
    
    <div class="hourly-forecast">
      <div 
        v-for="(hour, index) in hourlyForecast" 
        :key="index"
        class="hour"
      >
        <div class="time">{{ hour.time }}</div>
        <div class="icon"><i :class="hour.icon"></i></div>
        <div class="temp">{{ hour.temp }}°</div>
      </div>
    </div>
    
    <div class="daily-forecast">
      <div 
        v-for="(day, index) in dailyForecast" 
        :key="index"
        class="day"
      >
        <div class="day-name">{{ day.day }}</div>
        <div class="weather-icon"><i :class="day.icon"></i></div>
        <div class="precip">
          <i class="fas fa-tint"></i> {{ day.precipChance }}%
        </div>
        <div class="temp-range">
          <span class="high">{{ day.high }}°</span>
          <span class="low">{{ day.low }}°</span>
        </div>
      </div>
    </div>
    
    <div class="weather-details">
      <div class="detail">
        <div class="label">SUNRISE</div>
        <div class="value">{{ sunrise }}</div>
      </div>
      <div class="detail">
        <div class="label">SUNSET</div>
        <div class="value">{{ sunset }}</div>
      </div>
      <div class="detail">
        <div class="label">HUMIDITY</div>
        <div class="value">{{ humidity }}%</div>
      </div>
      <div class="detail">
        <div class="label">WIND</div>
        <div class="value">{{ windSpeed }} {{ windUnit }} {{ windDirection }}</div>
      </div>
      <div class="detail">
        <div class="label">FEELS LIKE</div>
        <div class="value">{{ feelsLikeTemp }}°{{ isCelsius ? 'C' : 'F' }}</div>
      </div>
      <div class="detail">
        <div class="label">PRESSURE</div>
        <div class="value">{{ pressure }} hPa</div>
      </div>
      <div class="detail">
        <div class="label">PRECIP CHANCE</div>
        <div class="value">{{ precipChance }}%</div>
      </div>
      <div class="detail">
        <div class="label">UV INDEX</div>
        <div class="value">{{ uvIndex }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { useStateDataStore } from '@client/stores/stateDataStore';
import { storeToRefs } from 'pinia';

// Component doesn't need any props for now
// Props are defined but not used to maintain component API compatibility

const stateDataStore = useStateDataStore();
const { environment, state } = storeToRefs(stateDataStore);

// Simple debug logging
const log = (label, data) => {
  console.log(`[Weather] ${label}:`, data);
};

// Log initial state
log('Initial environment', environment?.value);
log('Initial state', state?.value);

// Ensure state is properly initialized
const initialized = ref(false);

// Get the current forecast data
const currentForecast = computed(() => {
  if (!state?.value?.forecast) {
    log('No forecast data available in state');
    return { 
      current: {}, 
      hourly: { 
        time: [], 
        temperature_2m: [],
        weather_code: [],
        relative_humidity_2m: [],
        apparent_temperature: [],
        precipitation_probability: [],
        wind_speed_10m: [],
        wind_direction_10m: []
      } 
    };
  }
  log('Forecast data:', state.value.forecast);
  return state.value.forecast;
});

// Get current weather from forecast
const currentWeather = computed(() => {
  return currentForecast.value.current || {};
});

// Get hourly forecast
const hourlyForecast = computed(() => {
  try {
    const forecast = currentForecast.value;
    if (!forecast?.hourly?.time?.length) return [];
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    
    return forecast.hourly.time
      .map((time, index) => ({
        time,
        timeString: new Date(time).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        }),
        temp: Math.round(forecast.hourly.temperature_2m?.[index] || 0),
        icon: getWeatherIcon(forecast.hourly.weather_code?.[index] || 0),
        humidity: forecast.hourly.relative_humidity_2m?.[index] || 0,
        feelsLike: Math.round(forecast.hourly.apparent_temperature?.[index] || 0),
        precip: forecast.hourly.precipitation_probability?.[index] || 0,
        windSpeed: Math.round(forecast.hourly.wind_speed_10m?.[index] || 0),
        windDirection: getWindDirection(forecast.hourly.wind_direction_10m?.[index])
      }))
      .filter(hour => new Date(hour.time) > oneHourAgo) // Only keep future hours
      .map(hour => ({
        ...hour,
        time: hour.timeString // Use the formatted time string for display
      }));
  } catch (error) {
    console.error('Error processing hourly forecast:', error);
    return [];
  }
});

// Process daily forecast data
const processDailyForecast = (dailyData) => {
  if (!dailyData?.time?.length) return [];
  
  return dailyData.time.map((dateStr, index) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    return {
      date: dateStr,
      day: dayName,
      dateObj: date,
      high: Math.round(dailyData.temperature_2m_max?.[index] || 0),
      low: Math.round(dailyData.temperature_2m_min?.[index] || 0),
      weatherCode: dailyData.weather_code?.[index] || 0,
      precipChance: dailyData.precipitation_probability_max?.[index] || 0,
      totalPrecip: (dailyData.precipitation_sum?.[index] || 0).toFixed(2),
      avgHumidity: dailyData.relative_humidity_2m_mean?.[index] || 0,
      maxWindSpeed: Math.round(dailyData.wind_speed_10m_max?.[index] || 0),
      avgWindSpeed: Math.round(dailyData.wind_speed_10m_mean?.[index] || 0),
      maxWindGust: Math.round(dailyData.wind_gusts_10m_max?.[index] || 0),
      avgWindDirection: dailyData.wind_direction_10m_dominant?.[index] || 0,
      avgCloudCover: Math.round(dailyData.cloud_cover_mean?.[index] || 0),
      sunrise: dailyData.sunrise?.[index] || '',
      sunset: dailyData.sunset?.[index] || '',
      uvIndexMax: Math.round(dailyData.uv_index_max?.[index] || 0),
      icon: getWeatherIcon(dailyData.weather_code?.[index] || 0),
      condition: getWeatherCondition(dailyData.weather_code?.[index] || 0)
    };
  });
};

// Get daily forecast
const dailyForecast = computed(() => {
  try {
    const forecast = currentForecast.value;
    if (!forecast?.daily) return [];
    
    return processDailyForecast(forecast.daily);
  } catch (error) {
    console.error('Error processing daily forecast:', error);
    return [];
  }
});

// Weather data
const locationName = ref('');
const locationDetails = ref('');

// Function to get location name from coordinates
async function updateLocationName(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
    );
    const data = await response.json();
    
    if (data.address) {
      const { city, town, village, state, country } = data.address;
      locationName.value = city || town || village || data.display_name?.split(',')[0] || 'Current Location';
      
      // Create a more detailed location string (city, state, country)
      const details = [];
      if (city || town || village) details.push(city || town || village);
      if (state) details.push(state);
      if (country) details.push(country);
      
      locationDetails.value = details.filter(Boolean).join(', ');
    }
  } catch (error) {
    console.error('Error getting location name:', error);
    locationName.value = 'Current Location';
    locationDetails.value = '';
  }
}
const lastUpdated = ref('Just now');
const currentTemp = ref(0);
const highTemp = ref(0);
const lowTemp = ref(0);
const currentCondition = ref('Clear');
const feelsLikeTemp = ref(0);
const humidity = ref(0);
const windSpeed = ref(0);
const windDirection = ref('N/A');
const pressure = ref(0);
const precipChance = ref(0);
const uvIndex = ref(0);
const sunrise = ref('--:--');
const sunset = ref('--:--');
const isCelsius = ref(true);

// Unit handling
const pressureUnit = ref('hPa');  // Default unit, will be updated from forecast

// Helper function to map weather code to condition
const getWeatherCondition = (code) => {
  if (code === undefined) return 'Clear';
  
  // Weather code mapping (you may need to adjust based on your API's codes)
  const conditions = {
    0: 'Clear',
    1: 'Mostly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Freezing Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    56: 'Light Freezing Drizzle',
    57: 'Dense Freezing Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    66: 'Light Freezing Rain',
    67: 'Heavy Freezing Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    85: 'Slight Snow Showers',
    86: 'Heavy Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Slight Hail',
    99: 'Thunderstorm with Heavy Hail'
  };
  
  return conditions[code] || 'Unknown';
};

// Helper function to get wind direction from degrees
const getWindDirection = (degrees) => {
  if (degrees === undefined) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
};

// Computed properties
const weatherIcon = computed(() => {
  // Map condition codes to Font Awesome icons
  const condition = currentCondition.value?.toLowerCase() || '';
  if (condition.includes('clear')) return 'fas fa-sun';
  if (condition.includes('cloud')) return 'fas fa-cloud';
  if (condition.includes('rain')) return 'fas fa-cloud-rain';
  if (condition.includes('snow')) return 'fas fa-snowflake';
  if (condition.includes('thunder')) return 'fas fa-bolt';
  if (condition.includes('fog') || condition.includes('mist')) return 'fas fa-smog';
  return 'fas fa-cloud-sun';
});

// Unit computations
const windUnit = computed(() => {
  if (currentForecast.value.current_units?.wind_speed_10m) {
    return currentForecast.value.current_units.wind_speed_10m;
  }
  return isCelsius.value ? 'km/h' : 'mph';
});

// Methods
async function updateWeatherData() {
  log('Updating weather data');
  
  try {
    const weather = currentWeather.value;
    const forecast = currentForecast.value;
    
    log('=== Weather Data ===');
    log('Current weather:', weather);
    log('Forecast data:', forecast);
    
    // Skip if no weather data
    if (!weather || Object.keys(weather).length === 0) {
      log('No weather data available');
      return;
    }
    
    // Current conditions - using the new data structure
    currentTemp.value = Math.round(weather.temperature_2m ?? 0);
    currentCondition.value = getWeatherCondition(weather.weather_code);
    feelsLikeTemp.value = Math.round(weather.apparent_temperature ?? 0);
    humidity.value = weather.relative_humidity_2m ?? 0;
    pressure.value = weather.pressure_msl ? Math.round(weather.pressure_msl) : 0;
    precipChance.value = weather.precipitation_probability || 0;
    
    // Wind
    windSpeed.value = Math.round(weather.wind_speed_10m ?? 0);
    windDirection.value = getWindDirection(weather.wind_direction_10m);
    // Update pressure unit if available in the forecast
    if (currentForecast.value.current_units?.pressure_msl) {
      pressureUnit.value = currentForecast.value.current_units.pressure_msl;
    }
    
    // Update time
    lastUpdated.value = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Debug log the weather data
    console.log('Weather data received:', {
      metadata: currentForecast.value.metadata,
      currentWeather: weather
    });

    // Update location name from metadata coordinates if available
    if (currentForecast.value.metadata?.latitude && currentForecast.value.metadata?.longitude) {
      console.log('Updating location with coordinates from metadata:', 
        currentForecast.value.metadata.latitude, 
        currentForecast.value.metadata.longitude
      );
      await updateLocationName(
        currentForecast.value.metadata.latitude, 
        currentForecast.value.metadata.longitude
      );
    } else {
      console.log('No coordinates available in metadata');
      locationName.value = 'Current Location';
      locationDetails.value = '';
    }
    
    // Update high/low and UV index from daily forecast
    if (dailyForecast.value.length > 0) {
      const today = dailyForecast.value[0];
      console.log("TODAY FORECAST", today);
      highTemp.value = today.high;
      lowTemp.value = today.low;
      uvIndex.value = today.uvIndexMax ?? 0;
    }
    
    // Update sunrise/sunset from daily forecast
    if (dailyForecast.value.length > 0) {
      const today = dailyForecast.value[0];
      if (today.sunrise) {
        const sunriseDate = new Date(today.sunrise);
        sunrise.value = sunriseDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      if (today.sunset) {
        const sunsetDate = new Date(today.sunset);
        sunset.value = sunsetDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
    }
    
    log('Updated weather data:', {
      temp: currentTemp.value,
      condition: currentCondition.value,
      feelsLike: feelsLikeTemp.value,
      high: highTemp.value,
      low: lowTemp.value,
      humidity: humidity.value,
      wind: `${windSpeed.value} ${windUnit.value} ${windDirection.value}`,
      pressure: `${pressure.value} hPa`,
      location: location.value,
      lastUpdated: lastUpdated.value
    });
  } catch (error) {
    console.error('Error updating weather data:', error);
  }
}

const getWeatherIcon = (conditionCode) => {
  // Map condition codes to Font Awesome icons
  // This is a simplified mapping - you may need to adjust based on your data
  if (conditionCode >= 200 && conditionCode < 300) return 'fas fa-bolt';
  if (conditionCode >= 300 && conditionCode < 400) return 'fas fa-cloud-rain';
  if (conditionCode >= 500 && conditionCode < 600) return 'fas fa-cloud-showers-heavy';
  if (conditionCode >= 600 && conditionCode < 700) return 'fas fa-snowflake';
  if (conditionCode >= 700 && conditionCode < 800) return 'fas fa-smog';
  if (conditionCode === 800) return 'fas fa-sun';
  if (conditionCode > 800) return 'fas fa-cloud';
  return 'fas fa-cloud-sun';
};

// Watch for changes in forecast data
watchEffect(() => {
  // This will run whenever the forecast data changes
  if (state?.value?.forecast) {
    log('Forecast data changed, updating weather...');
    
    if (!initialized.value) {
      log('Initial data loaded');
      initialized.value = true;
    }
    
    updateWeatherData();
  } else {
    log('Waiting for forecast data...');
  }
});

// Initialize
const updateInterval = ref(null);

onMounted(() => {
  // Set up initial values
  currentCondition.value = getWeatherCondition(currentWeather.value?.weather_code);
  
  try {
    // Initial update
    updateWeatherData();
    // Update weather data every 5 minutes
    updateInterval.value = setInterval(() => {
      try {
        updateWeatherData();
      } catch (error) {
        console.error('Error in scheduled weather update:', error);
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error initializing weather component:', error);
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value);
    updateInterval.value = null;
  }
  initialized.value = false;
});
</script>

<style scoped>
.weather-component {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem;
  color: var(--text-color);
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.location {
  font-weight: 500;
}

.current-weather {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.temperature {
  font-size: 3.5rem;
  font-weight: 300;
  line-height: 1;
}

.temperature .unit {
  font-size: 1.5rem;
  vertical-align: super;
  opacity: 0.8;
}

.weather-icon {
  font-size: 2.5rem;
  margin: 0 1rem;
  color: var(--primary);
}

.conditions {
  text-align: right;
}

.condition {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.hi-low {
  font-size: 0.9rem;
  opacity: 0.8;
}

.hourly-forecast {
  display: flex;
  overflow-x: auto;
  gap: 1.5rem;
  padding: 0.5rem 0;
  margin-bottom: 1.5rem;
  scrollbar-width: none; /* Firefox */
}

.hourly-forecast::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3rem;
}

.hour .time {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
}

.hour .icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
  color: var(--primary);
}

.hour .temp {
  font-size: 0.9rem;
  font-weight: 500;
}

.daily-forecast {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.day {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.day:last-child {
  border-bottom: none;
}

.day-name {
  width: 4rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.day .weather-icon {
  width: 2rem;
  margin: 0 1rem 0 0.5rem;
  font-size: 1.1rem;
  text-align: center;
}

.precip {
  display: flex;
  align-items: center;
  width: 3.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.precip i {
  margin-right: 0.25rem;
  font-size: 0.7rem;
  opacity: 0.7;
}

.temp-range {
  display: flex;
  justify-content: space-between;
  width: 5rem;
  margin-left: auto;
  font-size: 0.9rem;
}

.temp-range .high {
  font-weight: 500;
}

.temp-range .low {
  opacity: 0.7;
}

.weather-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.detail {
  display: flex;
  flex-direction: column;
}

.detail .label {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail .value {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .weather-component {
    background: var(--card-bg-dark);
    color: var(--text-color-dark);
  }
  
  .day {
    border-bottom-color: var(--border-color-dark);
  }
  
  .weather-details {
    border-top-color: var(--border-color-dark);
  }
}
</style>
