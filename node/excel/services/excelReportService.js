import ExcelJS from "exceljs";
import fs from "fs";

export async function createExcelReport(data, filePath) {

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("Employees");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 25 },
    { header: "Department", key: "department", width: 20 },
    { header: "Salary", key: "salary", width: 15 }
  ];

  sheet.getRow(1).font = { bold: true };

  data.forEach(emp => {
    sheet.addRow(emp);
  });

  sheet.addRow([]);

  sheet.addRow([
    "",
    "",
    "Total Salary",
    { formula: `SUM(D2:D${sheet.rowCount})` }
  ]);

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 }
  ];

  summarySheet.addRow({
    metric: "Total Employees",
    value: data.length
  });

  const totalSalary = data.reduce((a, b) => a + b.salary, 0);

  summarySheet.addRow({
    metric: "Total Salary",
    value: totalSalary
  });

  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }

  await workbook.xlsx.writeFile(filePath);

}