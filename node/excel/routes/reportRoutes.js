import express from "express";
import { downloadExcel, downloadCSV } from "../controllers/reportController.js";

const router = express.Router();

router.get("/excel", downloadExcel);
router.get("/csv", downloadCSV);

export default router;