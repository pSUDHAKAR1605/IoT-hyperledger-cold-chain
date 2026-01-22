import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  const [sensorData, setSensorData] = useState({
    humidity: null,
    temperature: null,
    lightStatus: null,
    vibrationStatus: null,
    gps: {
      latitude: null,
      longitude: null,
    },
    error: null
  });

  // Function to fetch sensor data from the backend
  const fetchData = async () => {
    try {
      const response = await axios.get('http://192.168.34.128:3001/');
      setSensorData(response.data);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setSensorData({
        ...sensorData,
        error: 'Failed to fetch data from the backend.'
      });
    }
  };

  // Function to store sensor data on the blockchain
  const storeSensorData = async () => {
    try {
      const response = await axios.post('http://192.168.34.128:3001/api/storeSensorData');
      alert(`✅ Data Stored Successfully! ID: ${response.data.id}`);

     
    }catch (error) {
      console.error('Error storing sensor data:', error);
      alert('❌ Failed to store sensor data.');
    }
  };

  // Function to read sensor data from the blockchain
  // const readSensorData = async () => {
  //   try {
  //     const response = await axios.get('http://192.168.34.128:3001/api/readSensorData');
  //     alert('📡 Retrieved Data:\n' + JSON.stringify(response.data, null, 2));
  //   } catch (error) {
  //     console.error('Error reading sensor data:', error);
  //     alert('❌ Failed to retrieve sensor data.');
  //   }
  // };

  // Fetch data every 2 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🌡 Sensor Data</h1>

      {/* Buttons to Store and Read Sensor Data */}
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => navigate('/read-sensor-data')}>📊 View Sensor Data</button>
      </div>

      {sensorData.error ? (
        <p style={styles.error}>❌ Error: {sensorData.error}</p>
      ) : (
        <div style={styles.cardContainer}>
          <div style={{ ...styles.card, backgroundColor: '#FFCDD2' }}>
            <h2 style={styles.cardTitle}>🌡 Temperature: {sensorData.temperature ? `${sensorData.temperature}°C` : 'Loading...'}</h2>
          </div>
          <div style={{ ...styles.card, backgroundColor: '#C8E6C9' }}>
            <h2 style={styles.cardTitle}>💧 Humidity: {sensorData.humidity ? `${sensorData.humidity}%` : 'Loading...'}</h2>
          </div>
          <div style={{ ...styles.card, backgroundColor: '#FFF9C4' }}>
            <h2 style={styles.cardTitle}>💡 Light Status: {sensorData.lightStatus ? (sensorData.lightStatus === 'LIGHT_ON' ? 'On' : 'Off') : 'Loading...'}</h2>
          </div>
          <div style={{ ...styles.card, backgroundColor: '#FFECB3' }}>
            <h2 style={styles.cardTitle}>🔊 Vibration Status: {sensorData.vibrationStatus ? (sensorData.vibrationStatus === 'VIBRATION_HIGH' ? 'High' : 'Low') : 'Loading...'}</h2>
          </div>
          <div style={{ ...styles.card, backgroundColor: '#BBDEFB' }}>
            <h2 style={styles.cardTitle}>📍 GPS Latitude: {sensorData.gps.latitude ? sensorData.gps.latitude : 'Loading...'}</h2>
          </div>
          <div style={{ ...styles.card, backgroundColor: '#D1C4E9' }}>
            <h2 style={styles.cardTitle}>📍 GPS Longitude: {sensorData.gps.longitude ? sensorData.gps.longitude : 'Loading...'}</h2>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    padding: '30px',
    backgroundColor: '#f4f4f9',
  },
  title: {
    color: '#4CAF50',
    fontSize: '36px',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '10px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#4CAF50',
    color: 'white',
    transition: 'background 0.3s',
  },
  buttonHover: {
    backgroundColor: '#388E3C',
  },
  error: {
    color: '#ff4747',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '20px',
  },
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    padding: '20px',
    justifyItems: 'center',
  },
  card: {
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
    width: '300px',
    transition: 'transform 0.3s ease',
    color: '#333',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
};

export default App;
