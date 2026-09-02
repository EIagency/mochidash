import AdmZip from "adm-zip";

const zip = new AdmZip("../../assets/documents/files.zip");
zip.extractAllTo("./extracted", true);
for (const entry of zip.getEntries()) {
  console.log("ENTRY:", entry.entryName, entry.isDirectory ? "(dir)" : `(${entry.header.size} bytes)`);
}
console.log("DONE");
