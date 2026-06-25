// server/index.js
// Простий Express-сервер для ToDo List.
// Завдання зберігаються у файлі server/data/tasks.json (файлова система сервера),
// а не у localStorage браузера — це і є відмінність "просунутого" рівня.

const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- Робота з файлом-сховищем ----------

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

async function readTasks() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- API ----------

// Отримати всі завдання
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося прочитати завдання' });
  }
});

// Додати нове завдання
app.post('/api/tasks', async (req, res) => {
  const { text } = req.body;

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Текст завдання не може бути порожнім' });
  }

  try {
    const tasks = await readTasks();
    const newTask = { id: makeId(), text: text.trim(), done: false, createdAt: new Date().toISOString() };
    tasks.push(newTask);
    await writeTasks(tasks);
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося зберегти завдання' });
  }
});

// Оновити завдання (наприклад, позначити виконаним)
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { done, text } = req.body;

  try {
    const tasks = await readTasks();
    const idx = tasks.findIndex(t => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    if (typeof done === 'boolean') tasks[idx].done = done;
    if (typeof text === 'string' && text.trim()) tasks[idx].text = text.trim();

    await writeTasks(tasks);
    res.json(tasks[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося оновити завдання' });
  }
});

// Видалити завдання
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const tasks = await readTasks();
    const filtered = tasks.filter(t => t.id !== id);

    if (filtered.length === tasks.length) {
      return res.status(404).json({ error: 'Завдання не знайдено' });
    }

    await writeTasks(filtered);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося видалити завдання' });
  }
});

// Очистити весь список
app.delete('/api/tasks', async (req, res) => {
  try {
    await writeTasks([]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не вдалося очистити список' });
  }
});

// ---------- Старт сервера ----------

ensureStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`Сервер запущено: http://localhost:${PORT}`);
    console.log(`Дані зберігаються у файлі: ${DATA_FILE}`);
  });
});
