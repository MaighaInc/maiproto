import ExcelJS from "exceljs";
import fs from "fs";

export async function createExcelReport(data) {

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 25 },
    { header: "Department", key: "department", width: 20 },
    { header: "Salary", key: "salary", width: 15 }
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true };

  data.forEach(emp => {
    sheet.addRow(emp);
  });

  // Add total salary formula
  const lastRow = sheet.rowCount + 1;

  sheet.addRow([
    "",
    "",
    "Total Salary",
    { formula: `SUM(D2:D${sheet.rowCount})` }
  ]);

  sheet.getRow(lastRow).font = { bold: true };

  
  const imageId = workbook.addImage({
    filename: 'BizLog.png',
    extension: 'png',
  });
  sheet.addImage(imageId, 'E1:F4');

  // Ensure output directory
  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }

  await workbook.xlsx.writeFile("output/employees.xlsx");

  console.log("Excel file created: output/employees.xlsx");
}