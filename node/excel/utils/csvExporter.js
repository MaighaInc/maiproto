import fs from "fs";
import { format } from "fast-csv";

export function exportCSV(data, filePath) {

  const ws = fs.createWriteStream(filePath);

  const csvStream = format({ headers: true });

  csvStream.pipe(ws);

  data.forEach(row => csvStream.write(row));

  csvStream.end();

}