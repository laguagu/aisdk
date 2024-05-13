import React from 'react';

interface WeatherProps {
  city: string;
  unit: string;
}

const Weather: React.FC<WeatherProps> = ({ city, unit }) => {
  return (
    <div>
      <h2>Weather in {city}</h2>
      <p>Temperature: 25 {unit}</p>
      <p>Description: Sunny</p>
    </div>
  );
};

export default Weather;