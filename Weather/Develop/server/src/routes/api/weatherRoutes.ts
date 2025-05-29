import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const historyPath = path.join(__dirname, '../../../data/searchHistory.json');

const getCoordinates = async (city: string) => {
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`;
  const response = await axios.get(geoUrl);
  return response.data[0];
};

const getWeatherData = async (lat: number, lon: number) => {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`;
  const response = await axios.get(weatherUrl);
  return response.data;
};

router.post('/', async (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const coord = await getCoordinates(city);
    if (!coord) return res.status(404).json({ error: 'City not found' });

    const weather = await getWeatherData(coord.lat, coord.lon);

    let history = [];
    try {
      const data = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(data);
    } catch {
      // ignore
    }

    const newEntry = { id: uuidv4(), city };
    history.push(newEntry);
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));

    return res.json({ weather, id: newEntry.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/history', async (_req, res) => {
  try {
    const data = await fs.readFile(historyPath, 'utf8');
    const cities = JSON.parse(data);
    return res.json(cities);
  } catch {
    return res.json([]);
  }
});

router.delete('/history/:id', async (req, res) => {
  try {
    const data = await fs.readFile(historyPath, 'utf8');
    let cities = JSON.parse(data);
    const id = req.params.id;
    cities = cities.filter((c: any) => c.id !== id);
    await fs.writeFile(historyPath, JSON.stringify(cities, null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not delete city' });
  }
});

export default router;
