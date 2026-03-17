import express from "express";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

app.use("/reports", reportRoutes);

const PORT = 5503;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});