import { generateEmployees } from "../data/mockDataGenerator.js";
import { createExcelReport } from "../services/excelReportService.js";
import { exportCSV } from "../utils/csvExporter.js";

export async function downloadExcel(req, res) {

  const data = generateEmployees(1000);

  const filePath = "output/employees.xlsx";

  await createExcelReport(data, filePath);

  res.download(filePath);

}

export async function downloadCSV(req, res) {

  const data = generateEmployees(1000);

  const filePath = "output/employees.csv";

  exportCSV(data, filePath);

  res.download(filePath);

}