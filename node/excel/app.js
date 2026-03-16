import { createExcelReport } from "./services/excelService.js";
import { employees } from "./data/sampleData.js";

async function main() {

  try {

    await createExcelReport(employees);

  } catch (error) {

    console.error("Error creating Excel:", error);

  }

}

main();