import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import yahooFinance from 'yahoo-finance2';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('crypto_championships.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    cash_balance REAL DEFAULT 1000,
    bank_balance REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    amount REAL NOT NULL,
    cost_basis REAL NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS weekly_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    total_value REAL NOT NULL,
    profit_loss REAL NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prices (
    symbol TEXT PRIMARY KEY,
    name TEXT,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    price REAL NOT NULL
  );

  -- Migration: Add name column if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(prices)").all() as any[];
    if (!tableInfo.find(c => c.name === 'name')) {
      db.prepare("ALTER TABLE prices ADD COLUMN name TEXT").run();
    }
  } catch (e) {
    console.error("Migration error:", e);
  }

  INSERT OR IGNORE INTO app_state (key, value) VALUES ('current_week', '1');
  
  -- Seed initial prices if not exist
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('BTC-EUR', 'Bitcoin', 95000.00);
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('ETH-EUR', 'Ethereum', 2700.00);
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('SOL-EUR', 'Solana', 145.00);
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('DOGE-EUR', 'Dogecoin', 0.35);
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('ADA-EUR', 'Cardano', 0.75);
  INSERT OR IGNORE INTO prices (symbol, name, price) VALUES ('XRP-EUR', 'XRP', 2.10);
`);

// Seed initial history if empty
const hasHistory = db.prepare("SELECT count(*) as c FROM price_history").get() as { c: number };
if (hasHistory.c === 0) {
    const initialPrices = db.prepare("SELECT * FROM prices").all() as { symbol: string, price: number }[];
    const insertHist = db.prepare("INSERT INTO price_history (symbol, week_number, price) VALUES (?, ?, ?)");
    initialPrices.forEach(p => insertHist.run(p.symbol, 1, p.price));
}

const app = express();
app.use(express.json());

// Helper to get current prices from DB
const getPrice = (symbol: string): number => {
  const row = db.prepare("SELECT price FROM prices WHERE symbol = ?").get(symbol) as { price: number };
  return row ? row.price : 0;
};

// API Routes

// Get Assets
app.get('/api/assets', (req, res) => {
  const assets = db.prepare("SELECT * FROM prices").all();
  res.json(assets);
});

// Add Asset
app.post('/api/assets', (req, res) => {
  const { symbol, name, price } = req.body;
  if (!symbol || !price) return res.status(400).json({ error: "Symbol and price required" });
  
  try {
    const stmt = db.prepare("INSERT INTO prices (symbol, name, price) VALUES (?, ?, ?)");
    stmt.run(symbol, name || symbol, price);
    
    // Add initial history for current week
    const currentWeekRow = db.prepare("SELECT value FROM app_state WHERE key = 'current_week'").get() as { value: string };
    const currentWeek = parseInt(currentWeekRow?.value || '0');
    
    db.prepare("INSERT INTO price_history (symbol, week_number, price) VALUES (?, ?, ?)").run(symbol, currentWeek, price);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get App State
app.get('/api/state', (req, res) => {
  const row = db.prepare("SELECT value FROM app_state WHERE key = 'current_week'").get() as { value: string };
  res.json({ current_week: parseInt(row.value) });
});

// Get All Students (with calculated portfolio value)
app.get('/api/students', async (req, res) => {
  const students = db.prepare("SELECT * FROM students").all() as any[];
  const investments = db.prepare("SELECT * FROM investments").all() as any[];
  
  // Get all current prices
  const priceRows = db.prepare("SELECT * FROM prices").all() as { symbol: string, price: number }[];
  const prices: Record<string, number> = {};
  priceRows.forEach(p => prices[p.symbol] = p.price);

  const result = students.map(student => {
    const studentInvestments = investments.filter(i => i.student_id === student.id);
    let investmentValue = 0;
    
    const portfolio = studentInvestments.map(inv => {
      const currentPrice = prices[inv.symbol] || 0;
      const value = inv.amount * currentPrice;
      investmentValue += value;
      return { ...inv, currentPrice, value };
    });

    const totalValue = student.cash_balance + student.bank_balance + investmentValue;
    const startValue = 1000; // Hardcoded start
    const profitLoss = totalValue - startValue;

    return {
      ...student,
      portfolio,
      totalValue,
      profitLoss,
      investmentValue
    };
  });

  // Sort by total value (Leaderboard)
  result.sort((a, b) => b.totalValue - a.totalValue);

  res.json(result);
});

// Add Student
app.post('/api/students', (req, res) => {
  const { name, color } = req.body;
  const stmt = db.prepare("INSERT INTO students (name, color) VALUES (?, ?)");
  const info = stmt.run(name, color);
  res.json({ id: info.lastInsertRowid });
});

// Buy Crypto
app.post('/api/investments/buy', async (req, res) => {
  const { studentId, symbol, amountInEuro } = req.body;
  
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as any;
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (student.cash_balance < amountInEuro) return res.status(400).json({ error: "Insufficient funds" });

  const price = getPrice(symbol);
  if (price === 0) return res.status(400).json({ error: "Invalid symbol or price unavailable" });

  const cryptoAmount = amountInEuro / price;

  const updateCash = db.prepare("UPDATE students SET cash_balance = cash_balance - ? WHERE id = ?");
  const insertInv = db.prepare("INSERT INTO investments (student_id, symbol, amount, cost_basis) VALUES (?, ?, ?, ?)");

  const transaction = db.transaction(() => {
    updateCash.run(amountInEuro, studentId);
    insertInv.run(studentId, symbol, cryptoAmount, amountInEuro);
  });

  transaction();
  res.json({ success: true });
});

// Sell Crypto
app.post('/api/investments/sell', async (req, res) => {
  const { studentId, investmentId } = req.body;
  
  const investment = db.prepare("SELECT * FROM investments WHERE id = ? AND student_id = ?").get(investmentId, studentId) as any;
  if (!investment) return res.status(404).json({ error: "Investment not found" });

  const price = getPrice(investment.symbol);
  const saleValue = investment.amount * price;

  const updateCash = db.prepare("UPDATE students SET cash_balance = cash_balance + ? WHERE id = ?");
  const deleteInv = db.prepare("DELETE FROM investments WHERE id = ?");

  const transaction = db.transaction(() => {
    updateCash.run(saleValue, studentId);
    deleteInv.run(investmentId);
  });

  transaction();
  res.json({ success: true });
});

// Bank Operations
app.post('/api/bank/deposit', (req, res) => {
  const { studentId, amount } = req.body;
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as any;
  if (student.cash_balance < amount) return res.status(400).json({ error: "Insufficient funds" });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE students SET cash_balance = cash_balance - ? WHERE id = ?").run(amount, studentId);
    db.prepare("UPDATE students SET bank_balance = bank_balance + ? WHERE id = ?").run(amount, studentId);
  });
  transaction();
  res.json({ success: true });
});

app.post('/api/bank/withdraw', (req, res) => {
  const { studentId, amount } = req.body;
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as any;
  if (student.bank_balance < amount) return res.status(400).json({ error: "Insufficient bank funds" });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE students SET bank_balance = bank_balance - ? WHERE id = ?").run(amount, studentId);
    db.prepare("UPDATE students SET cash_balance = cash_balance + ? WHERE id = ?").run(amount, studentId);
  });
  transaction();
  res.json({ success: true });
});

// Advance Week (Admin)
app.post('/api/admin/next-week', async (req, res) => {
  console.log("Received request to advance week");
  try {
    const currentWeekRow = db.prepare("SELECT value FROM app_state WHERE key = 'current_week'").get() as { value: string };
    let currentWeek = parseInt(currentWeekRow?.value || '1');
    console.log(`Current week is: ${currentWeek}`);

    // 1. Increment Week FIRST to ensure it happens
    const nextWeek = currentWeek + 1;
    db.prepare("UPDATE app_state SET value = ? WHERE key = 'current_week'").run(nextWeek.toString());
    console.log(`Week incremented to: ${nextWeek}`);

    // 2. Simulate Price Changes
    const allPrices = db.prepare("SELECT * FROM prices").all() as { symbol: string, price: number }[];
    const updatePrice = db.prepare("UPDATE prices SET price = ? WHERE symbol = ?");
    const insertHist = db.prepare("INSERT INTO price_history (symbol, week_number, price) VALUES (?, ?, ?)");
    const newPrices: Record<string, number> = {};

    const transaction = db.transaction(() => {
      allPrices.forEach(p => {
        const changePercent = (Math.random() * 0.20) - 0.10; 
        const newPrice = p.price * (1 + changePercent);
        updatePrice.run(newPrice, p.symbol);
        insertHist.run(p.symbol, nextWeek, newPrice);
        newPrices[p.symbol] = newPrice;
      });
      db.prepare("UPDATE students SET bank_balance = bank_balance * 1.03").run();
    });
    transaction();

    // 3. Snapshot
    const students = db.prepare("SELECT * FROM students").all() as any[];
    const investments = db.prepare("SELECT * FROM investments").all() as any[];

    const transaction2 = db.transaction(() => {
      const insertSnapshot = db.prepare("INSERT INTO weekly_snapshots (student_id, week_number, total_value, profit_loss, timestamp) VALUES (?, ?, ?, ?, ?)");
      
      students.forEach(student => {
          const updatedStudent = db.prepare("SELECT * FROM students WHERE id = ?").get(student.id) as any;
          const studentInvestments = investments.filter(i => i.student_id === student.id);
          let investmentValue = 0;
          studentInvestments.forEach(inv => {
              investmentValue += inv.amount * (newPrices[inv.symbol] || 0);
          });
          const totalValue = updatedStudent.cash_balance + updatedStudent.bank_balance + investmentValue;
          const profitLoss = totalValue - 1000;
          
          insertSnapshot.run(student.id, currentWeek, totalValue, profitLoss, new Date().toISOString());
      });
    });
    transaction2();

    res.json({ success: true, new_week: nextWeek });
  } catch (error: any) {
    console.error("Error advancing week:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Reset App (Admin)
app.post('/api/admin/reset', async (req, res) => {
  console.log("Received request to reset app");
  try {
    const transaction = db.transaction(() => {
      // 1. Clear Tables
      db.prepare("DELETE FROM weekly_snapshots").run();
      db.prepare("DELETE FROM investments").run();
      db.prepare("DELETE FROM students").run();
      db.prepare("DELETE FROM price_history").run();
      
      // 2. Reset State
      db.prepare("UPDATE app_state SET value = '0' WHERE key = 'current_week'").run();
      db.prepare("UPDATE app_state SET value = '1.0' WHERE key = 'market_multiplier'").run();

      // 3. Reset Prices to Initial
      const initialPrices = [
        { symbol: 'BTC-EUR', name: 'Bitcoin', price: 95000.00 },
        { symbol: 'ETH-EUR', name: 'Ethereum', price: 2700.00 },
        { symbol: 'SOL-EUR', name: 'Solana', price: 145.00 },
        { symbol: 'DOGE-EUR', name: 'Dogecoin', price: 0.35 },
        { symbol: 'ADA-EUR', name: 'Cardano', price: 0.75 },
        { symbol: 'XRP-EUR', name: 'XRP', price: 2.10 }
      ];
      
      const updatePrice = db.prepare("INSERT OR REPLACE INTO prices (symbol, name, price) VALUES (?, ?, ?)");
      initialPrices.forEach(p => updatePrice.run(p.symbol, p.name, p.price));

      // 4. Seed History for Week 0
      const insertHist = db.prepare("INSERT INTO price_history (symbol, week_number, price) VALUES (?, ?, ?)");
      initialPrices.forEach(p => insertHist.run(p.symbol, 0, p.price));

      // 5. Create Test User
      const insertStudent = db.prepare("INSERT INTO students (name, color, cash_balance, bank_balance) VALUES (?, ?, ?, ?)");
      const studentId = insertStudent.run("Joan Byers", "#94a3b8", 0, 400).lastInsertRowid;

      // 6. Create Investments
      const insertInv = db.prepare("INSERT INTO investments (student_id, symbol, amount, cost_basis) VALUES (?, ?, ?, ?)");
      
      // €300 BTC
      const btcPrice = 95000.00;
      insertInv.run(studentId, 'BTC-EUR', 300 / btcPrice, 300);

      // €300 ETH
      const ethPrice = 2700.00;
      insertInv.run(studentId, 'ETH-EUR', 300 / ethPrice, 300);
    });

    transaction();
    console.log("App reset successfully");
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error resetting app:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Get History
app.get('/api/history', (req, res) => {
    const history = db.prepare("SELECT * FROM weekly_snapshots ORDER BY week_number ASC").all();
    res.json(history);
});

// Get Market History
app.get('/api/market/history', (req, res) => {
    const history = db.prepare("SELECT * FROM price_history ORDER BY week_number ASC").all();
    res.json(history);
});


async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
