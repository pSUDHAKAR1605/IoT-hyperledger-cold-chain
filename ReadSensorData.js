import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ReadSensorData() {
  const [sensorRecords, setSensorRecords] = useState([]);
  const navigate = useNavigate();

  // Function to fetch sensor data from the blockchain
  const fetchSensorData = async () => {
    try {
      const response = await axios.get('http://192.168.34.128:3001/api/readSensorData');
      setSensorRecords(response.data);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setSensorRecords([]);
    }
  };

  // Fetch data on page load
  useEffect(() => {
    fetchSensorData();
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '30px' }}>
      <h1>📊 Stored Sensor Data</h1>
      <button onClick={() => navigate('/')}>⬅ Back to Home</button>

      {sensorRecords.length === 0 ? (
        <p>No sensor data found.</p>
      ) : (
        <table border="1" style={{ margin: '20px auto', width: '80%', textAlign: 'center' }}>
          <thead>
            <tr>
              
              <th>Temperature (°C)</th>
              <th>Humidity (%)</th>
              <th>Light Status</th>
              <th>Vibration Status</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Alert</th>
              
            </tr>
          </thead>
          <tbody>
            {sensorRecords.map((record, index) => (
              <tr key={index}>
                
                <td>{record.Temperature}</td>
                <td>{record.Humidity}</td>
                <td>{record.Light}</td>
                <td>{record.Vibration}</td>
                <td>{record.Latitude}</td>
                <td>{record.Longtitude}</td>
                <td>{record.Alert}</td>
              
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ReadSensorData;