import { FC, useState } from "react";

import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import mammoth from "mammoth";

type SelectInputProps = {
  onFileSelect: (val: string) => void;
};

const SelectInput: FC<SelectInputProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState("");

  const handleFileChange = async (event: any) => {
    const fileName = event.target.value;
    setSelectedFile(fileName);

    // Load file from assets folder
    try {
      const baseUrl = import.meta.env.BASE_URL;
      const response = await fetch(`${baseUrl}files/${fileName}.docx`);

      const arrayBuffer = await response.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer });

      onFileSelect(value);
    } catch (error) {
      console.error("Error loading document:", error);
    }
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="demo-simple-select-helper-label">Document</InputLabel>
      <Select
        labelId="demo-simple-select-helper-label"
        label="Document"
        value={selectedFile}
        onChange={handleFileChange}
      >
        <MenuItem value="protocol">Protocol Document</MenuItem>
        <MenuItem value="sample">Sample Document</MenuItem>
      </Select>
    </FormControl>
  );
};

export default SelectInput;
