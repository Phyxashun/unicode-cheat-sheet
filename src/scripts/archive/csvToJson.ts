// scripts/csvToJson.ts
import Bun, { type BunFile } from "bun";

/**
 * Converts a CSV file to a JSON file. Can create an array of objects
 * or a single object keyed by a specific column.
 *
 * @param inputPath The path to the source CSV file.
 * @param outputPath The path where the destination JSON file will be written.
 * @param delimiter The character separating columns in the CSV. Defaults to ','.
 * @param keyColumn If provided, the output will be a single object where keys are the values from this column.
 */
export async function csvToJson(
  inputPath: string,
  outputPath: string,
  delimiter: string = ",",
  keyColumn?: string, // This parameter is now optional
): Promise<void> {
  try {
    console.log(`Reading CSV file from: ${inputPath}`);
    const csvFile: BunFile = Bun.file(inputPath);
    const csvText: string = await csvFile.text();

    const lines: string[] = csvText.trim().split("\n");

    if (lines.length < 2) {
      // ... (error handling is the same)
      await Bun.write(outputPath, keyColumn ? "{}" : "[]");
      return;
    }

    const headers: string[] = lines[0]
      .split(delimiter)
      .map((header) => header.trim().replace(/"/g, ""));

    // Error handling if the specified keyColumn doesn't exist
    if (keyColumn && !headers.includes(keyColumn)) {
      console.error(
        `❌ Error: The specified key column "${keyColumn}" was not found in the CSV headers: [${headers.join(", ")}]`,
      );
      return;
    }

    // --- LOGIC CHANGE IS HERE ---

    if (keyColumn) {
      // If a keyColumn is provided, build an object of objects
      const jsonObject: Record<string, Record<string, string>> = {};
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const values: string[] = lines[i]
          .split(delimiter)
          .map((value) => value.trim().replace(/"/g, ""));
        const rowObject: Record<string, string> = {};

        headers.forEach((header, index) => {
          rowObject[header] = values[index] || "";
        });

        const key = rowObject[keyColumn];
        if (key) {
          // Remove the key itself from the inner object
          delete rowObject[keyColumn];
          jsonObject[key] = rowObject;
        }
      }
      await Bun.write(outputPath, JSON.stringify(jsonObject, null, 2));
      console.log(
        `✅ Successfully converted to a keyed object. JSON file saved to: ${outputPath}`,
      );
    } else {
      // If no keyColumn, build an array of objects (original behavior)
      const jsonArray: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const values: string[] = lines[i]
          .split(delimiter)
          .map((value) => value.trim().replace(/"/g, ""));
        const rowObject: Record<string, string> = {};

        headers.forEach((header, index) => {
          rowObject[header] = values[index] || "";
        });
        jsonArray.push(rowObject);
      }
      await Bun.write(outputPath, JSON.stringify(jsonArray, null, 2));
      console.log(
        `✅ Successfully converted to an array of objects. JSON file saved to: ${outputPath}`,
      );
    }
  } catch (error) {
    console.error(`❌ An error occurred: ${error}`);
  }
}
