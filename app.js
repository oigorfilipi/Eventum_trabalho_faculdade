import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// rota de health mínima
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'eventum-api' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

