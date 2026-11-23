import fs from "fs";

export const getVersion = () => {
  try {
    const packageJsonContent = fs.readFileSync("./package.json", "utf8");
    const packageJson = JSON.parse(packageJsonContent);
    const version = packageJson.version;
    return version;
  } catch (error) {
    console.error("Error reading or parsing package.json:", error);
    return error;
  }
};
